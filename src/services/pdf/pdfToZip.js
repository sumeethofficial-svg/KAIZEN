import JSZip from "jszip";

/**
 * Validate that a file is a PDF.
 */
function isPdfFile(file) {
  return (
    file &&
    (file.type === "application/pdf" ||
      file.name
        .toLowerCase()
        .endsWith(".pdf"))
  );
}

/**
 * Create a safe ZIP entry name.
 *
 * Prevents duplicate names when multiple files
 * have the same filename.
 */
function createUniqueFileName(
  fileName,
  usedNames
) {
  const lastDot =
    fileName.lastIndexOf(".");

  const baseName =
    lastDot > 0
      ? fileName.slice(0, lastDot)
      : fileName;

  const extension =
    lastDot > 0
      ? fileName.slice(lastDot)
      : "";

  let candidate =
    `${baseName}${extension}`;

  let counter = 2;

  while (
    usedNames.has(
      candidate.toLowerCase()
    )
  ) {
    candidate =
      `${baseName} (${counter})${extension}`;

    counter += 1;
  }

  usedNames.add(
    candidate.toLowerCase()
  );

  return candidate;
}

/**
 * Get basic information about PDF files.
 */
export function getPdfFilesInfo(files) {
  if (!files || files.length === 0) {
    throw new Error(
      "Please select at least one PDF file."
    );
  }

  const pdfFiles =
    Array.from(files);

  for (
    let index = 0;
    index < pdfFiles.length;
    index += 1
  ) {
    if (!isPdfFile(pdfFiles[index])) {
      throw new Error(
        `"${pdfFiles[index].name}" is not a valid PDF file.`
      );
    }
  }

  return {
    count: pdfFiles.length,
    totalSize: pdfFiles.reduce(
      (total, file) =>
        total + file.size,
      0
    ),
    files: pdfFiles.map(
      (file) => ({
        name: file.name,
        size: file.size,
        type:
          file.type ||
          "application/pdf",
      })
    ),
  };
}

/**
 * Create a ZIP archive containing PDF files.
 *
 * Each PDF is stored as an individual file
 * inside the generated ZIP.
 */
export async function createPdfZip(
  files,
  options = {},
  onProgress
) {
  if (!files || files.length === 0) {
    throw new Error(
      "Please select at least one PDF file."
    );
  }

  const pdfFiles =
    Array.from(files);

  for (
    let index = 0;
    index < pdfFiles.length;
    index += 1
  ) {
    if (!isPdfFile(pdfFiles[index])) {
      throw new Error(
        `"${pdfFiles[index].name}" is not a valid PDF file.`
      );
    }
  }

  const zip =
    new JSZip();

  const usedNames =
    new Set();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress({
      percent: 5,
      completed: 0,
      total: pdfFiles.length,
      currentFile: null,
    });
  }

  for (
    let index = 0;
    index < pdfFiles.length;
    index += 1
  ) {
    const file =
      pdfFiles[index];

    const zipFileName =
      createUniqueFileName(
        file.name,
        usedNames
      );

    zip.file(
      zipFileName,
      file
    );

    if (
      typeof onProgress ===
      "function"
    ) {
      const percent =
        10 +
        Math.round(
          ((index + 1) /
            pdfFiles.length) *
            35
        );

      onProgress({
        percent,
        completed: index + 1,
        total: pdfFiles.length,
        currentFile:
          file.name,
      });
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress({
      percent: 50,
      completed: pdfFiles.length,
      total: pdfFiles.length,
      currentFile: null,
    });
  }

  const zipBlob =
    await zip.generateAsync(
      {
        type: "blob",
        mimeType:
          "application/zip",
        compression:
          options.compression ||
          "DEFLATE",
        compressionOptions: {
          level:
            Number(
              options.compressionLevel
            ) || 6,
        },
        streamFiles: false,
      },
      (metadata) => {
        if (
          typeof onProgress !==
          "function"
        ) {
          return;
        }

        const zipPercent =
          Number(
            metadata?.percent
          ) || 0;

        const percent =
          50 +
          Math.round(
            zipPercent * 0.5
          );

        onProgress({
          percent: Math.min(
            100,
            Math.round(
              percent
            )
          ),
          completed:
            pdfFiles.length,
          total:
            pdfFiles.length,
          currentFile:
            metadata?.currentFile ||
            null,
        });
      }
    );

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress({
      percent: 100,
      completed: pdfFiles.length,
      total: pdfFiles.length,
      currentFile: null,
    });
  }

  return {
    blob: zipBlob,
    fileCount:
      pdfFiles.length,
    originalSize:
      pdfFiles.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    zipSize:
      zipBlob.size,
    compression:
      options.compression ||
      "DEFLATE",
    compressionLevel:
      Number(
        options.compressionLevel
      ) || 6,
    files:
      pdfFiles.map(
        (file, index) => ({
          originalName:
            file.name,
          zipName:
            Array.from(
              usedNames
            )[index],
          size:
            file.size,
        })
      ),
  };
}