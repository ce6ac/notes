# notes

## why?
notes is my git repo for [notes](https://notes.sebbe.com/), a project i made because i was bored.
it allows users to create and view "burner" notes with encryption implemented, ensuring that your input is securely stored and only accessible via generated links.

## how it works
all notes are encrypted and decrypted on the client-side, meaning the server only stores encrypted data.
this functionality is maintained by generating a key, iv (initializing vector) and encrypting your input with aes-gcm, then encoding it into base64 to allow for easy server-side storage of the encrypted note. once a note is created it gets assigned a noteId and a link with the following format is generated: ```/noteId#keysToDecrypt```. while the noteId is retrieved from the server, the key and iv included in the link is retrieved from the client-side encryption and never reaches the server.

to view a note, you visit a generated link from the sender. if the noteId exists on the server, you will see a button to view the note, otherwise the 404 page is shown.
when the note is fetched it's encoded in base64, so on the client-side the note first gets decoded then decrypted into plaintext (assuming correct keys are included).
once the note has been retrieved from the server it gets deleted, allowing it only to be retrieved once.

### storage inside memory
the server stores the encrypted notes in memory which means they should never be written to a filesystem. to manage multiple notes we store the timestamp of when each note was created so that we can delete the oldest created note if we require space for new notes.

## deployment
```
// clone repo
git clone https://github.com/ce6ac/notes.git

// install packages
npm install

// run server.js
node server.js

// optionally you can use the following arguments:
// -mempool <size in bytes>        - sets maximum memory utilization for storing notes before they start getting deleted
// -max <size in bytes>            - sets the maximum size a note can be
// -ratelimit <notes per minute>   - sets the allowed amount of notes that can be created per minute by a user
```

