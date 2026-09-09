import { PDFDocument } from "pdf-lib";

/**
 * Load a PDF and return its page count.
 */
export async function getPdfPageCount(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer);

  return sourcePdf.getPageCount();
}

/**
 * Split a PDF into multiple parts.
 *
 * Example:
 * splitPdfEveryNPages(file, 2)
 *
 * A 5-page PDF becomes:
 * Part 1 -> pages 1-2
 * Part 2 -> pages 3-4
 * Part 3 -> page 5
 *
 * Returns:
 * [
 *   {
 *     blob,
 *     startPage,
 *     endPage,
 *     pageCount,
 *     partNumber
 *   }
 * ]
 */
export async function splitPdfEveryNPages(file, pagesPerPart) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  if (!Number.isInteger(pagesPerPart) || pagesPerPart < 1) {
    throw new Error("Pages per part must be a positive whole number.");
  }

  const fileBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer);

  const totalPages = sourcePdf.getPageCount();
  const results = [];

  for (
    let startIndex = 0, partNumber = 1;
    startIndex < totalPages;
    startIndex += pagesPerPart, partNumber += 1
  ) {
    const endIndex = Math.min(
      startIndex + pagesPerPart,
      totalPages
    );

    const outputPdf = await PDFDocument.create();

    const pageIndices = [];

    for (let pageIndex = startIndex; pageIndex < endIndex; pageIndex += 1) {
      pageIndices.push(pageIndex);
    }

    const pages = await outputPdf.copyPages(
      sourcePdf,
      pageIndices
    );

    pages.forEach((page) => {
      outputPdf.addPage(page);
    });

    const pdfBytes = await outputPdf.save();

    const blob = new Blob([pdfBytes], {
      type: "application/pdf",
    });

    results.push({
      blob,
      startPage: startIndex + 1,
      endPage: endIndex,
      pageCount: endIndex - startIndex,
      partNumber,
    });
  }

  return results;
}