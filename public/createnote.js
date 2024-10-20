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

    const encryptedArray = new Uint8Array(encryptedData);
    
    // size limit
    const MAX_ENCRYPTED_SIZE = 65536;
    if (encryptedArray.length > MAX_ENCRYPTED_SIZE) {
        alert("note size limit reached, please shorten your note");
        return;
    }
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    // get raw key
    const exportedKey = await window.crypto.subtle.exportKey("raw", key);

    // convert to hex
    const combinedArray = new Uint8Array(exportedKey.byteLength + iv.byteLength);
    combinedArray.set(new Uint8Array(exportedKey), 0);
    combinedArray.set(iv, exportedKey.byteLength);

    // Convert combined byte array to hex
    const combinedHex = Array.from(combinedArray)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return {
        encryptedNote: encryptedBase64,
        combinedHex: combinedHex, // Return the combined hex
    };
}

let maxIndividualSize = 65536;

// chatgpt clutching hard here
function getByteLength(str) {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(str);
    return encoded.length;
}

document.addEventListener("DOMContentLoaded", () => {
    const createNoteButton = document.getElementById("create-note-button");
    const noteInput = document.getElementById("note-input");
	noteInput.placeholder += `\n(max encrypted size is ${maxIndividualSize} bytes)`;
    const noteControls = document.getElementById("note-link-display");
    createNoteButton.addEventListener("click", async () => {
        const noteContent = noteInput.value;
        if (!noteContent) {
            alert("cannot encrypt nothing...");
            return;
        }
        const result = await encryptNote(noteContent);
        
        // something went wrong in encryption and returned 0
        if (!result) {
            alert("could not encrypt note");
            return;
		}
        
        const { encryptedNote, combinedHex  } = result;
        const noteSize = getByteLength(encryptedNote);
        if (noteSize > maxIndividualSize) {
            // i dont think we'll reach this due to previous checks?
            return;
        }
        try {
            const response = await fetch("/create-note", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ encryptedNote }), // only send encrypted note, not keys
            });

            if (!response.ok) {
                throw new Error("network bad");
            }

            const data = await response.json();
            const noteLink = `${data.noteLink}#${combinedHex}`;
            noteInput.style.display = "none";
            noteInput.value = "";
            noteControls.innerHTML = `
                <input id="link-input" type="text" value="${noteLink}" readonly />
                <button id="copy-link-button">copy</button>
                <button id="view-raw-button">proof</button>
                <button id="create-new-button">new</button>
            `;
            const h1Title = document.getElementById("title");
            h1Title.innerHTML = "link to note";
			
            const copyButton = document.getElementById("copy-link-button");
            copyButton.onclick = () => {
                const linkInput = document.getElementById("link-input");
                linkInput.select();
                document.execCommand("copy");
            };
			
            const viewRawButton = document.getElementById("view-raw-button");
            viewRawButton.onclick = () => {
                h1Title.innerHTML = "raw data sent to server";
                noteInput.style.display = "inline-block";
                noteInput.value = result.encryptedNote;
                viewRawButton.style.display = "none";
            };

            const newButton = document.getElementById("create-new-button");
            newButton.onclick = () => {
                window.location.href = "/";
            };
			
        } catch (error) {
            console.error("error creating note:", error);
            alert("failed to create note. please try again.");
        }
    });
});



