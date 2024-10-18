const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static("public"));

// in memory
const notes = {};
let maxTotalSize = 524288000; // 500mb
let maxIndividualSize = 65536; // 65.536kb
let totalSize = 0; // track the total size of all notes

const manageNotesSize = (newNoteSize) => {
    while (totalSize + newNoteSize > maxTotalSize) {
        const oldestNoteId = Object.keys(notes).sort((a, b) => notes[a].createdAt - notes[b].createdAt)[0];
        if (oldestNoteId) {
            totalSize -= Buffer.byteLength(notes[oldestNoteId].encryptedNote);
            delete notes[oldestNoteId]; // delete oldest
        }
    }
};

// make sure noteid does not already exist
const generateUniqueId = () => {
    let noteId;
    do {
        noteId = crypto.randomBytes(32).toString("hex");
    } while (notes[noteId]);
    return noteId;
};

app.post("/create-note", (req, res) => {
    const { encryptedNote } = req.body; // only expect encrypted note
	
    const noteSize = Buffer.byteLength(encryptedNote);
    if (noteSize > maxIndividualSize) {
        return res.status(400).json({ error: "max size reached" });
    }
    manageNotesSize(noteSize);
    const noteId = generateUniqueId();

    // store in memory
    notes[noteId] = {
        encryptedNote,
		createdAt: Date.now() // timestamp for sorting
    };
	
	totalSize += noteSize;
	//console.log(`occupying ${totalSize} bytes of memory`);

    // construct the link, partially, rest is handled on clientside
    const noteLink = `https://notes.sebbe.com/${noteId}`; 
    res.json({ noteLink });
});

// view note page
app.get("/:noteId", (req, res) => {
    const noteId = req.params.noteId;

    // exists?
    if (!notes[noteId]) {
        return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
    }

    // inject noteid into note.html
    fs.readFile(path.join(__dirname, "public", "note.html"), "utf8", (err, data) => {
        if (err) {
            console.error("error reading note.html:", err);
            return res.status(500).sendFile(path.join(__dirname, "public", "error.html")); // Send error page
        }

        // injection
        const updatedData = data.replace(/window\.noteId = '';/, `window.noteId = "${noteId}";`);

        res.send(updatedData); // send back modified html
    });
});

// get the actual note
app.get("/get-note/:noteId", (req, res) => {
    const noteId = req.params.noteId;

    if (!notes[noteId]) {
        return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
    }

    // get the note from memory
    const { encryptedNote }	= notes[noteId];

    // send back the note only
    res.json({ encryptedNote });
});

app.delete("/delete-note/:noteId", (req, res) => {
    const noteId = req.params.noteId;

    if (!notes[noteId]) {
        return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
    }

    // free up memory
    const noteSize = Buffer.byteLength(notes[noteId].encryptedNote);
    totalSize -= noteSize; // adjust the total size
    delete notes[noteId];
    res.status(200).json({ message: "deleted" });
});

// global error handler
app.use((err, req, res, next) => {
    console.error("error:", err);
    res.status(500).sendFile(path.join(__dirname, "public", "error.html"));
});

// start the server
app.listen(PORT, '127.0.0.1', () => {
    console.log(`running on port ${PORT}`);
});
