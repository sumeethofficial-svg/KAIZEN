export function createTextFile(text, options = {}) {
  if (typeof text !== "string") {
    throw new Error("Invalid text content.");
  }

  if (!text.trim()) {
    throw new Error("Please enter some text.");
  }

  const {
    filename = "kaizen-file.txt",
    mimeType = "text/plain;charset=utf-8",
  } = options;

  const blob = new Blob([text], {
    type: mimeType,
  });

  return {
    blob,
    filename,
    size: blob.size,
    mimeType,
  };
}

export function downloadTextFile(text, options = {}) {
  const result = createTextFile(text, options);

  const url = URL.createObjectURL(result.blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = result.filename;
  link.style.display = "none";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);

  return result;
}