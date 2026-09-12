export function generateRenamedFiles(
  files,
  pattern,
  startNumber = 1
) {
  if (!files || files.length === 0) {
    throw new Error("Please select files first.");
  }

  if (!pattern?.trim()) {
    throw new Error("Enter a rename pattern.");
  }

  return files.map((file, index) => {
    const extensionMatch =
      file.name.match(/(\.[^./\\]+)$/);

    const extension = extensionMatch
      ? extensionMatch[1]
      : "";

    const originalName = file.name.replace(
      /\.[^/.]+$/,
      ""
    );

    const number = String(
      Number(startNumber) + index
    ).padStart(2, "0");

    let newName = pattern
      .replace(/\{n\}/gi, number)
      .replace(/\{name\}/gi, originalName)
      .replace(
        /\{ext\}/gi,
        extension.replace(".", "")
      );

    newName = newName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .trim();

    if (!newName) {
      newName = `file-${number}`;
    }

    if (!/\.[^./\\]+$/.test(newName) && extension) {
      newName += extension;
    }

    return {
      file,
      originalName: file.name,
      newName,
    };
  });
}