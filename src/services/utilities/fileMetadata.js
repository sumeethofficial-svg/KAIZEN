function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getExtension(name) {
  const parts = name.split(".");

  if (parts.length <= 1) {
    return "";
  }

  return parts.pop().toLowerCase();
}

function getFileName(name) {
  const parts = name.split(".");

  if (parts.length <= 1) {
    return name;
  }

  parts.pop();
  return parts.join(".");
}

export function getFileMetadata(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  return {
    name: file.name,
    extension: getExtension(file.name) || "None",
    baseName: getFileName(file.name),
    type: file.type || "Unknown",
    size: file.size,
    formattedSize: formatBytes(file.size),
    lastModified: file.lastModified,
    lastModifiedDate: file.lastModified
      ? new Date(file.lastModified).toLocaleString()
      : "Unknown",
  };
}