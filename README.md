# notes

### why?
notes is my git repo for notes.sebbe.com, a project i made because i was bored.
it allows users to create and view notes with encryption implemented, ensuring that your input is securely stored and only accessible via generated links.

### how it works
all notes are encrypted and decrypted on the client-side, meaning the server only stores encrypted data.
this functionality is maintained by first encrypting your input with aes-gcm and generating a key and iv (initializing vector) for it.
the encrypted input is encoded into base64 to allow the server to store it as a string. this is also the string that is shown when clicking "proof".

on the server the encrypted strings are stored as an array in memory, which means they are never saved to a filesystem, but instead the notes existance is fully within the hosts memory.

when viewing the note, you gather the noteid from the link, along with the key and iv used to decrypt it.
when the data is gathered it's still encoded with base64 from the server so it decodes it into the data which then gets decrypted into plaintext on the client side.
once the note content has been retreived from the server we're deleting the note from memory, allowing it only to be seen by a single recipient.

### storage inside memory
since we're storing the encrypted data in memory it means it should never be written to a filesystem, however to make sure there is enough memory we're also storing the timestamp of when the note was created so that we can delete the oldest created note to ensure memory usage does not exceed the set limit.

## requirements
### node.js
yes, it's node.js.

### npm
install following packages:
```npm install express body-parser crypto path fs```

### SSL
(unless localhost)


