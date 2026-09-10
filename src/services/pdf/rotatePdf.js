import { PDFDocument, degrees } from "pdf-lib";

/**
 * Load a PDF and return its page count.
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
 * Normalize a rotation value to:
 * 0, 90, 180, or 270 degrees.
 */
function normalizeRotation(rotation) {
  const numericRotation = Number(rotation);

  if (!Number.isFinite(numericRotation)) {
    return 0;
  }

  const normalized =
    ((numericRotation % 360) + 360) % 360;

  return (
    Math.round(normalized / 90) * 90
  ) % 360;
}

/**
 * Validate the requested page selection.
 *
 * Pages are 1-based because that is what the UI presents
 * to the user.
 */
function validatePageSelection(
  selectedPages,
  totalPages
) {
  if (selectedPages === null) {
    return null;
  }

  if (!Array.isArray(selectedPages)) {
    throw new Error(
      "Invalid page selection."
    );
  }

  if (selectedPages.length === 0) {
    throw new Error(
      "Select at least one page to rotate."
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
 * Rotate selected or all pages in a PDF.
 *
 * @param {File} file
 * @param {number} rotation
 * @param {number[]|null} selectedPages
 *
 * selectedPages:
 *   null       → rotate all pages
 *   [1, 3, 5] → rotate only pages 1, 3 and 5
 *
 * rotation:
 *   90
 *   180
 *   270
 */
export async function rotatePdf(
  file,
  rotation,
  selectedPages = null
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const normalizedRotation =
    normalizeRotation(rotation);

  if (
    ![90, 180, 270].includes(
      normalizedRotation
    )
  ) {
    throw new Error(
      "Rotation must be 90, 180, or 270 degrees."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  const pdf =
    await PDFDocument.load(fileBuffer);

  const totalPages =
    pdf.getPageCount();

  const pageSelection =
    validatePageSelection(
      selectedPages,
      totalPages
    );

  /*
   * Set of 1-based page numbers that
   * should actually be rotated.
   */
  const pagesToRotate =
    pageSelection === null
      ? null
      : new Set(pageSelection);

  for (
    let index = 0;
    index < totalPages;
    index += 1
  ) {
    const pageNumber = index + 1;

    /*
     * When selection is provided, skip pages
     * that were not selected.
     */
    if (
      pagesToRotate !== null &&
      !pagesToRotate.has(pageNumber)
    ) {
      continue;
    }

    const page = pdf.getPage(index);

    const currentRotation =
      normalizeRotation(
        page.getRotation().angle
      );

    const finalRotation =
      normalizeRotation(
        currentRotation +
          normalizedRotation
      );

    page.setRotation(
      degrees(finalRotation)
    );
  }

  const pdfBytes =
    await pdf.save();

  return new Blob(
    [pdfBytes],
    {
      type: "application/pdf",
    }
  );
}