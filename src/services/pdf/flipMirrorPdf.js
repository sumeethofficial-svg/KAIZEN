import { PDFDocument } from "pdf-lib";

/**
 * Get the number of pages in a PDF.
 */
export async function getPdfPageCount(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);

  return pdf.getPageCount();
}

/**
 * Validate the flip / mirror mode.
 */
function validateMode(mode) {
  const validModes = [
    "horizontal",
    "vertical",
    "both",
  ];

  if (!validModes.includes(mode)) {
    throw new Error(
      "Flip mode must be horizontal, vertical, or both."
    );
  }

  return mode;
}

/**
 * Validate selected pages.
 *
 * null = all pages
 */
function validatePageSelection(
  selectedPages,
  totalPages
) {
  if (
    selectedPages === null ||
    selectedPages === undefined
  ) {
    return null;
  }

  if (!Array.isArray(selectedPages)) {
    throw new Error(
      "Invalid page selection."
    );
  }

  if (selectedPages.length === 0) {
    throw new Error(
      "Select at least one page to flip."
    );
  }

  const normalizedPages =
    selectedPages.map((pageNumber) => {
      const page = Number(pageNumber);

      if (!Number.isInteger(page)) {
        throw new Error(
          "Page selection must contain whole-number page values."
        );
      }

      if (
        page < 1 ||
        page > totalPages
      ) {
        throw new Error(
          `Page ${page} does not exist in this PDF.`
        );
      }

      return page;
    });

  return [
    ...new Set(normalizedPages),
  ].sort((a, b) => a - b);
}

/**
 * Calculate the transformation matrix
 * required for the requested flip.
 *
 * PDF coordinates use the bottom-left
 * as the origin.
 */
function getFlipTransform(
  width,
  height,
  mode
) {
  switch (mode) {
    case "horizontal":
      return {
        a: -1,
        b: 0,
        c: 0,
        d: 1,
        e: width,
        f: 0,
      };

    case "vertical":
      return {
        a: 1,
        b: 0,
        c: 0,
        d: -1,
        e: 0,
        f: height,
      };

    case "both":
      return {
        a: -1,
        b: 0,
        c: 0,
        d: -1,
        e: width,
        f: height,
      };

    default:
      throw new Error(
        "Unsupported flip mode."
      );
  }
}

/**
 * Flip / mirror selected PDF pages.
 *
 * The transformation is applied directly
 * to each page's content without changing
 * the page dimensions.
 */
export async function flipMirrorPdf(
  file,
  mode,
  selectedPages = null,
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const normalizedMode =
    validateMode(mode);

  const fileBuffer =
    await file.arrayBuffer();

  if (typeof onProgress === "function") {
    onProgress(5);
  }

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  const totalPages =
    pdf.getPageCount();

  if (totalPages < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  const pageSelection =
    validatePageSelection(
      selectedPages,
      totalPages
    );

  const pagesToFlip =
    pageSelection === null
      ? null
      : new Set(pageSelection);

  if (typeof onProgress === "function") {
    onProgress(15);
  }

  let processedPages = 0;

  for (
    let index = 0;
    index < totalPages;
    index += 1
  ) {
    const pageNumber =
      index + 1;

    if (
      pagesToFlip !== null &&
      !pagesToFlip.has(pageNumber)
    ) {
      continue;
    }

    const page =
      pdf.getPage(index);

    const width =
      page.getWidth();

    const height =
      page.getHeight();

    const transform =
      getFlipTransform(
        width,
        height,
        normalizedMode
      );

    page.scaleContent(
      transform.a,
      transform.d
    );

    page.translateContent(
      transform.e - width,
      transform.f - height
    );

    processedPages += 1;

    if (typeof onProgress === "function") {
      const totalSelectedPages =
        pageSelection === null
          ? totalPages
          : pageSelection.length;

      const percentage =
        15 +
        Math.round(
          (processedPages /
            totalSelectedPages) *
            75
        );

      onProgress(
        Math.min(90, percentage)
      );
    }
  }

  if (typeof onProgress === "function") {
    onProgress(94);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
    });

  if (typeof onProgress === "function") {
    onProgress(100);
  }

  return {
    blob: new Blob(
      [pdfBytes],
      {
        type: "application/pdf",
      }
    ),
    totalPages,
    mode: normalizedMode,
    flippedPages:
      pageSelection === null
        ? totalPages
        : pageSelection.length,
  };
}