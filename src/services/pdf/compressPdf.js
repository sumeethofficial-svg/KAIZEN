import { PDFDocument } from "pdf-lib";

/**
 * Get basic PDF information.
 */
export async function getPdfInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();

  const pdf = await PDFDocument.load(fileBuffer);

  return {
    pageCount: pdf.getPageCount(),
    originalSize: file.size,
  };
}

/**
 * Compress a PDF by re-saving it with
 * object streams enabled.
 *
 * Note:
 * pdf-lib does not perform lossy image
 * recompression, so the resulting size
 * may be similar to or even larger than
 * the original for some PDFs.
 */
export async function compressPdf(
  file,
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (typeof onProgress === "function") {
    onProgress(10);
  }

  const pdf =
    await PDFDocument.load(fileBuffer);

  if (typeof onProgress === "function") {
    onProgress(35);
  }

  const pageCount =
    pdf.getPageCount();

  if (pageCount < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  if (typeof onProgress === "function") {
    onProgress(55);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    });

  if (typeof onProgress === "function") {
    onProgress(90);
  }

  const blob = new Blob(
    [pdfBytes],
    {
      type: "application/pdf",
    }
  );

  const originalSize =
    file.size;

  const compressedSize =
    blob.size;

  const savedBytes =
    originalSize - compressedSize;

  const savedPercentage =
    originalSize > 0
      ? (savedBytes / originalSize) *
        100
      : 0;

  if (typeof onProgress === "function") {
    onProgress(100);
  }

  return {
    blob,
    pageCount,
    originalSize,
    compressedSize,
    savedBytes,
    savedPercentage,
    wasReduced:
      compressedSize < originalSize,
  };
}