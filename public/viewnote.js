async function decryptNote(encryptedNote, combinedHex) {
  // define lengths of the keys
  const keyLength = 32;
  const ivLength = 12;

  const keyHex = combinedHex.slice(0, keyLength * 2); // hex = 2 bytes
  const ivHex = combinedHex.slice(keyLength * 2, (keyLength + ivLength) * 2);

  // get key from hex
  const keyBuffer = new Uint8Array(keyHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

  const key = await window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    {
      name: "AES-GCM",
    },
    false,
    ["decrypt"]
  );

  const ivBuffer = new Uint8Array(ivHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
  const encryptedArray = Uint8Array.from(atob(encryptedNote), (c) => c.charCodeAt(0));
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    encryptedArray
  );

  // convert decrypted data to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}

function displayError(message) {
  const existingError = document.getElementById("error");
  if (existingError) {
    existingError.textContent = message;
  } else {
    const errorDiv = document.createElement("div");
    errorDiv.id = "error";
    errorDiv.className = "error";
    errorDiv.textContent = message;
  
    const titleElement = document.getElementById("title");
    titleElement.insertAdjacentElement("afterend", errorDiv);
  }
}

function clearError() {
  const existingError = document.getElementById("error");
  if (existingError) {
    existingError.remove();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const hash = window.location.hash.substring(1);
  const noteId = window.location.pathname.split("/").pop();
  const combinedHex = hash.split("#")[0];

  history.replaceState(null, "", "/"); // hide data stored in url

  document.getElementById("view-note-button").onclick = async () => {
    const noteContentElement = document.getElementById("note-content");
    const viewNoteButton = document.getElementById("view-note-button");

    if (noteId && combinedHex) {
      try {
        // get note content
        const response = await fetch(`/get-note/${noteId}`);

        if (!response.ok) {
          const errorData = await response.json();
          displayError(errorData.error);
          return;
        }
        clearError();
        console.log("note content has been destroyed");

        const { encryptedNote } = await response.json();

        // decrypt
        const decryptedNote = await decryptNote(encryptedNote, combinedHex);

        // show note
        noteContentElement.innerHTML = decryptedNote;
        noteContentElement.style.display = "block";
        viewNoteButton.style.display = "none";
      } catch (error) {
        displayError("error decrypting note");
      }
    } else {
      displayError("this note does not exist");
    }
  };
});
