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
 * Validate and normalize page ranges.
 *
 * Input:
 * [
 *   { start: 1, end: 5 },
 *   { start: 8, end: 12 }
 * ]
 *
 * Output:
 * [
 *   { start: 1, end: 5 },
 *   { start: 8, end: 12 }
 * ]
 */
export function validatePageRanges(ranges, totalPages) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    throw new Error("The PDF does not contain any pages.");
  }

  if (!Array.isArray(ranges) || ranges.length === 0) {
    throw new Error("Please add at least one page range.");
  }

  const normalizedRanges = ranges.map((range, index) => {
    const start = Number(range?.start);
    const end = Number(range?.end);

    if (!Number.isInteger(start) || !Number.isInteger(end)) {
      throw new Error(
        `Range ${index + 1} must contain valid whole-number page values.`
      );
    }

    if (start < 1 || end < 1) {
      throw new Error(
        `Range ${index + 1} must start at page 1 or later.`
      );
    }

    if (start > totalPages || end > totalPages) {
      throw new Error(
        `Range ${index + 1} exceeds the PDF's ${totalPages} page(s).`
      );
    }

    if (start > end) {
      throw new Error(
        `Range ${index + 1} is invalid. Start page must be less than or equal to end page.`
      );
    }

    return {
      start,
      end,
    };
  });

  const sortedRanges = [...normalizedRanges].sort(
    (a, b) => a.start - b.start
  );

  for (let index = 1; index < sortedRanges.length; index += 1) {
    const previous = sortedRanges[index - 1];
    const current = sortedRanges[index];

    if (current.start <= previous.end) {
      throw new Error(
        `Page ranges overlap between ${previous.start}-${previous.end} and ${current.start}-${current.end}.`
      );
    }
  }

  return normalizedRanges;
}

/**
 * Split a PDF into parts of every N pages.
 *
 * Example:
 * 10-page PDF + 3 pages per part:
 *
 * Part 1 → 1-3
 * Part 2 → 4-6
 * Part 3 → 7-9
 * Part 4 → 10
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

    for (
      let pageIndex = startIndex;
      pageIndex < endIndex;
      pageIndex += 1
    ) {
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

/**
 * Split a PDF using explicit page ranges.
 *
 * Example:
 * [
 *   { start: 1, end: 5 },
 *   { start: 8, end: 12 },
 *   { start: 20, end: 24 }
 * ]
 *
 * Pages that are not included in any range are excluded.
 */
export async function splitPdfByRanges(file, ranges) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(fileBuffer);

  const totalPages = sourcePdf.getPageCount();

  const normalizedRanges = validatePageRanges(
    ranges,
    totalPages
  );

  const results = [];

  normalizedRanges.forEach(() => {
    // Intentionally empty.
  });

  for (
    let rangeIndex = 0;
    rangeIndex < normalizedRanges.length;
    rangeIndex += 1
  ) {
    const range = normalizedRanges[rangeIndex];

    const outputPdf = await PDFDocument.create();

    const pageIndices = [];

    for (
      let pageNumber = range.start;
      pageNumber <= range.end;
      pageNumber += 1
    ) {
      pageIndices.push(pageNumber - 1);
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
      startPage: range.start,
      endPage: range.end,
      pageCount: range.end - range.start + 1,
      partNumber: rangeIndex + 1,
    });
  }

  return results;
}