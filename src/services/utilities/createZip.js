import JSZip from "jszip";

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (!(file instanceof File)) {
      reject(
        new Error(
          `"${file?.name || "Unknown file"}" is not a valid file.`
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(
          new Error(`Could not read "${file.name}".`)
        );
      }
    };

    reader.onerror = () => {
      reject(
        new Error(`Could not read "${file.name}".`)
      );
    };

    reader.onabort = () => {
      reject(
        new Error(`Reading "${file.name}" was cancelled.`)
      );
    };

    reader.readAsArrayBuffer(file);
  });
}

export async function createZip(files, options = {}) {
  if (!files || files.length === 0) {
    throw new Error("Please select at least one file.");
  }

  const zip = new JSZip();

  for (const item of files) {
    const file = item.file || item;

    if (!(file instanceof File)) {
      continue;
    }

    const arrayBuffer = await readFileAsArrayBuffer(file);

    /*
     * When a folder is selected, the JSX supplies
     * a relativePath such as:
     *
     * project/src/App.jsx
     *
     * Otherwise use the normal file name.
     */
    const filePath =
      item.relativePath ||
      file.webkitRelativePath ||
      file.name;

    zip.file(
      filePath,
      new Uint8Array(arrayBuffer)
    );
  }

  if (Object.keys(zip.files).length === 0) {
    throw new Error("No readable files were found.");
  }

  try {
    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 6,
      },
    });

    if (!blob || blob.size === 0) {
      throw new Error(
        "The generated ZIP archive is empty."
      );
    }

    return {
      blob,
      filename:
        options.filename || "kaizen-files.zip",
      fileCount: files.length,
      size: blob.size,
    };
  } catch (error) {
    console.error(
      "ZIP generation error:",
      error
    );

    throw new Error(
      error?.message ||
        "Failed to create the ZIP archive."
    );
  }
}