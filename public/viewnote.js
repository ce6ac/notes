async function decryptNote(encryptedNote, keyHex, ivHex) {
    // get key from hex
    const keyBuffer = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const key = await window.crypto.subtle.importKey(
        "raw",
        keyBuffer,
        {
            name: "AES-GCM",
        },
        false,
        ["decrypt"]
    );

    const ivBuffer = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const encryptedArray = Uint8Array.from(atob(encryptedNote), c => c.charCodeAt(0));
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

document.addEventListener("DOMContentLoaded", async () => {
    const hash = window.location.hash.substring(1);
    const noteId = window.noteId; // global
    const [keyBase64, ivBase64] = hash.split("#");
	
    document.getElementById("view-note-button").onclick = async () => {
        const noteContentElement = document.getElementById("note-content");
        const viewNoteButton = document.getElementById("view-note-button");

        if (noteId && keyBase64 && ivBase64) {
            try {
                // get note content
                const response = await fetch(`/get-note/${noteId}`);
                const { encryptedNote } = await response.json();

                // decrypt
                const decryptedNote = await decryptNote(encryptedNote, keyBase64, ivBase64);

                // delete
                await fetch(`/delete-note/${noteId}`, { method: "DELETE" });

                // show note
                noteContentElement.innerText = decryptedNote;
                noteContentElement.style.display = "block";
                viewNoteButton.style.display = "none";
            } catch (error) {
                console.error("error:", error);
                alert("failed to get note, bad keys or read already?")
                location.reload(false);
            }
        } else {
            noteContentElement.innerText = "this note does not exist, perhaps it's already been read?";
            noteContentElement.style.display = "block";
            viewNoteButton.style.display = "none";
        }
    };
});
