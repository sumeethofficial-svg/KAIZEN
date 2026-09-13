export function encodeBase64(text) {
  if (typeof text !== "string") {
    throw new Error("Invalid text input.");
  }

  if (!text) {
    throw new Error("Please enter some text to encode.");
  }

  try {
    const bytes = new TextEncoder().encode(text);

    let binary = "";

    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(
        ...bytes.subarray(i, i + chunkSize)
      );
    }

    return btoa(binary);
  } catch (error) {
    console.error("Base64 encoding error:", error);
    throw new Error("Failed to encode the text.");
  }
}

export function decodeBase64(base64) {
  if (typeof base64 !== "string") {
    throw new Error("Invalid Base64 input.");
  }

  if (!base64.trim()) {
    throw new Error("Please enter Base64 data to decode.");
  }

  try {
    const cleaned = base64.replace(/\s/g, "");

    const binary = atob(cleaned);

    const bytes = Uint8Array.from(binary, (char) =>
      char.charCodeAt(0)
    );

    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.error("Base64 decoding error:", error);
    throw new Error("Invalid Base64 data.");
  }
}