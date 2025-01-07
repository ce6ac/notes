const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const app = express();
const rateLimit = require("express-rate-limit");

const PORT = 3000;

app.use(bodyParser.json({ limit: "1.01mb" }));
app.use(express.static("public"));

// in memory
const notes = {};
let maxTotalSize = 80 * 1024 * 1024; // 80mb
let maxNoteSize = 1 * 1024 * 1024; // 1mb
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
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "index.html"));
});

// make sure noteid does not already exist
const generateUniqueId = () => {
  let noteId;
  do {
    noteId = crypto.randomBytes(32).toString("hex");
  } while (notes[noteId]);
  return noteId;
};

const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: "too many requests, please try again later." },
});

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
  res.json({ noteId });
});

app.get("/faq", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "faq.html"));
});

// view note page
app.get("/:noteId", (req, res) => {
  const noteId = req.params.noteId;

  // exists?
  if (!notes[noteId]) {
    return res.status(404).sendFile(path.join(__dirname, "html", "404.html"));
  }

  res.sendFile(path.join(__dirname, "html", "note.html"));
});

// get the actual note
app.get("/get-note/:noteId", (req, res) => {
  const noteId = req.params.noteId;

  if (!notes[noteId]) {
    return res.status(404).sendFile(path.join(__dirname, "html", "404.html"));
  }

  // get the note from memory
  const { encryptedNote } = notes[noteId];

  // free up memory
  const noteSize = Buffer.byteLength(notes[noteId].encryptedNote);
  totalSize -= noteSize; // adjust the total size
  delete notes[noteId];

  // send back the note only
  res.json({ encryptedNote });
});

// error handler
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    console.error("payload too large:", err);
    return res.status(413).json({
      error: "payload too large",
    });
  }

  console.error("error:", err);
  res.status(500).json({ error: "An unexpected error occurred." });
});

// start the server
app.listen(PORT, "127.0.0.1", () => {
  console.log(`running on port ${PORT}`);
});
