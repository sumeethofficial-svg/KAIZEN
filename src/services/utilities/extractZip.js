import JSZip from "jszip";

export async function extractZip(file) {
  if (!file) {
    throw new Error("No ZIP file selected.");
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  if (extension !== "zip") {
    throw new Error("Please select a ZIP archive.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const entries = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    entries.push({
      name,
      directory: entry.dir,
      size: entry.dir ? 0 : entry._data?.uncompressedSize || 0,
    });
  }

  return {
    zip,
    entries,
  };
}

export async function extractZipFile(zip, entryName) {
  const entry = zip.file(entryName);

  if (!entry) {
    throw new Error("File not found inside ZIP.");
  }

  return entry.async("blob");
}