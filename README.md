# notes

### why?
notes is my git repo for [notes](https://notes.sebbe.com/), a project i made because i was bored.
it allows users to create and view "burner" notes with encryption implemented, ensuring that your input is securely stored and only accessible via generated links.

### how it works
all notes are encrypted and decrypted on the client-side, meaning the server only stores encrypted data.
this functionality is maintained by generating a key, iv (initializing vector) and encrypting your input with aes-gcm.
the encrypted input is encoded into base64 to allow the server to store it as a string. this is also the string that is shown when clicking the "proof" button.

on the server the encrypted strings are stored as an array in memory, which means they are never saved to a filesystem, but instead the notes existance is fully within the hosts memory.

when viewing the note, you gather the noteid from the link, along with the key and iv used to decrypt it.
when the data is gathered it's still encoded with base64 from the server so it decodes it into the data which then gets decrypted into plaintext on the client side.
once the note content has been retreived from the server we're deleting the note from memory, allowing it only to be seen by a single recipient.

### storage inside memory
since we're storing the encrypted data in memory it means it should never be written to a filesystem, however to make sure there is enough memory we're also storing the timestamp of when the note was created so that we can delete the oldest created note to ensure memory usage does not exceed the set limit.

## deployment
```
// clone repo
git clone https://github.com/ce6ac/notes.git

// install packages
npm install

// run server.js
node server.js 
// optionally you can use the following arguments:
// -mempool <size in bytes> - sets maximum memory utilization for storing notes before they start getting deleted
// -max <size in bytes> - sets the maximum size a note can be
//to set the max memory utilization and max note size
```

