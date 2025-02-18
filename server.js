const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const path = require("path");
const app = express();
const rateLimit = require("express-rate-limit");

const PORT = 3000;

app.use(bodyParser.json({ limit: "1.01mb" }));
app.use(express.static("public"));

const args = process.argv;

// default
let maxTotalSize = 80 * 1024 * 1024;
let maxNoteSize = 1 * 1024 * 1024;

// custom values
for (let i = 2; i < args.length; i++) {
  if (args[i] === "-mempool" && args[i + 1]) {
    maxTotalSize = parseInt(args[i + 1]);
    i++;
  }

  if (args[i] === "-max" && args[i + 1]) {
    maxNoteSize = parseInt(args[i + 1]);
    i++;
  }
}

// in memory
const notes = {};
let totalSize = 0; // track the total size of all notes

const manageNotesSize = (newNoteSize) => {
  while (totalSize + newNoteSize > maxTotalSize) {
    const oldestNoteId = Object.keys(notes).sort(
      (a, b) => notes[a].createdAt - notes[b].createdAt
    )[0];
    if (oldestNoteId) {
      totalSize -= Buffer.byteLength(notes[oldestNoteId].encryptedNote);
      delete notes[oldestNoteId]; // delete oldest
    }
  }
};

// home
const homePage = (req, res) => {
  res.sendFile(path.join(__dirname, "html", "index.html"));
};
app.get("/", homePage);
app.get("/home", homePage);

// make sure noteid does not already exist
const generateUniqueId = () => {
  let noteId;
  do {
    noteId = crypto.randomBytes(32).toString("hex");
  } while (notes[noteId]);
  return noteId;
};

// rate limiter
const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "too many requests, please try again later" },
});

// note creation endpoint
app.post("/create-note", rateLimiter, (req, res) => {
  const { encryptedNote } = req.body; // only expect encrypted note

  const noteSize = Buffer.byteLength(encryptedNote);
  if (noteSize > maxNoteSize) {
    return res.status(400).json({ error: "max size reached" });
  }
  manageNotesSize(noteSize);
  const noteId = generateUniqueId();

  // store in memory
  notes[noteId] = {
    encryptedNote,
    createdAt: Date.now(), // timestamp for sorting
  };

  totalSize += noteSize;

  // respond with noteId if successfully stored
  res.status(200).json({ noteId });
});

// serve faq page
app.get("/faq", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "faq.html"));
});

// serve note page
app.get("/:noteId", (req, res) => {
  const noteId = req.params.noteId;

  // exists?
  if (!notes[noteId]) {
    return res.status(404).sendFile(path.join(__dirname, "html", "404.html"));
  }

  res.sendFile(path.join(__dirname, "html", "note.html"));
});

// get note from server
app.get("/get-note/:noteId", rateLimiter, (req, res) => {
  const noteId = req.params.noteId;

  if (!notes[noteId]) {
    return res.status(404).json({
      error: "note does not exist",
    });
  }

  // get the note from memory
  const { encryptedNote } = notes[noteId];

  // free up memory
  const noteSize = Buffer.byteLength(notes[noteId].encryptedNote);
  totalSize -= noteSize; // adjust the total size
  delete notes[noteId];

  // ok send back the note only
  res.status(200).json({ encryptedNote });
});

// error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    console.error("payload too large:", err);
    return res.status(413).json({
      error: "note too big",
    });
  }

  console.error("error:", err);
  res.status(500).json({ error: "an unexpected error occurred" });
});

// start the server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`running on port ${PORT}`);
  console.log(`mempool size: ${maxTotalSize} bytes or ${maxTotalSize / 1024 / 1024} mb`);
  console.log(`max note size: ${maxNoteSize} bytes or ${maxNoteSize / 1024 / 1024} mb`);
});
