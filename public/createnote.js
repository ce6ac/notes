async function encryptNote(noteContent) {
  // gen key
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(noteContent);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // encrypt note
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    data
  );

  // base64
  const encryptedArray = new Uint8Array(encryptedData);
  const encryptedBase64 = (function (uint8Array) {
    let binaryString = "";
    for (let i = 0; i < uint8Array.length; i++) {
      binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
  })(encryptedArray);

  // get raw key
  const exportedKey = await window.crypto.subtle.exportKey("raw", key);

  // convert to hex
  const combinedArray = new Uint8Array(exportedKey.byteLength + iv.byteLength);
  combinedArray.set(new Uint8Array(exportedKey), 0);
  combinedArray.set(iv, exportedKey.byteLength);

  // convert combined byte array to hex
  const combinedHex = Array.from(combinedArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return {
    encryptedNote: encryptedBase64,
    combinedHex: combinedHex, // return the combined hex
  };
}

function displayError(message) {
  const existingError = document.getElementById("error");
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement("div");
  errorDiv.id = "error";
  errorDiv.className = "error";
  errorDiv.textContent = message;

  const titleElement = document.getElementById("title");
  titleElement.insertAdjacentElement("afterend", errorDiv);
}

function clearError() {
  const existingError = document.getElementById("error");
  if (existingError) {
    existingError.remove();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const createNoteButton = document.getElementById("create-note-button");
  const noteInput = document.getElementById("note-input");
  const noteControls = document.getElementById("note-link-display");

  noteInput.addEventListener("focus", () => {
    clearError();
  });

  createNoteButton.addEventListener("click", async () => {
    const noteContent = noteInput.value;
    if (!noteContent) {
      displayError("cannot encrypt nothing...");
      return;
    }
    const result = await encryptNote(noteContent);

    // something went wrong in encryption and returned 0
    if (!result) {
      displayError("something went wrong.");
      return;
    }

    const { encryptedNote, combinedHex } = result;

    try {
      const response = await fetch("/create-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ encryptedNote }), // only send encrypted note, not keys
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (
          response.status === 413 ||
          (response.status === 400 && errorData.error === "max size reached")
        ) {
          displayError("note size limit reached, try shortening your note.");
          return;
        } else {
          throw new Error("unknown");
        }
      }

      const data = await response.json();
      document.title = "notes - note created";
      const protocol = window.location.protocol;
      const domain = window.location.hostname;
      const port = window.location.port ? ":" + window.location.port : "";
      const noteLink = `${protocol}//${domain}${port}/${data.noteId}#${combinedHex}`;
      noteInput.style.display = "none";
      noteInput.value = "";
      noteControls.innerHTML = `
                <input id="link" type="text" value="${noteLink}" readonly />
                <button id="copy-link-button">copy</button>
                <button id="view-raw-button">proof</button>
                <button id="create-new-button">new</button>
            `;
      const h1Title = document.getElementById("title");
      h1Title.innerHTML = "link to note";

      const copyButton = document.getElementById("copy-link-button");
      copyButton.onclick = () => {
        const linkInput = document.getElementById("link");
        linkInput.select();
        document.execCommand("copy");
      };

      const viewRawButton = document.getElementById("view-raw-button");
      viewRawButton.onclick = () => {
        h1Title.innerHTML = "raw data sent to server";
        noteInput.style.display = "inline-block";
        noteInput.value = result.encryptedNote;
        noteInput.setAttribute("readonly", true);
        viewRawButton.style.display = "none";
      };

      const newButton = document.getElementById("create-new-button");
      newButton.onclick = () => {
        window.location.href = "/";
      };
    } catch (error) {
      console.error(error);
      displayError("failed to create note. please try again.");
    }
  });
});
