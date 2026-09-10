import { PDFDocument, degrees } from "pdf-lib";

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
 * Create the initial page model used by the Organize Pages UI.
 *
 * Example for a 4-page PDF:
 *
 * [
 *   {
 *     id: "page-0-0",
 *     sourceIndex: 0,
 *     pageNumber: 1,
 *     rotation: 0
 *   },
 *   ...
 * ]
 *
 * rotation represents the user's additional rotation applied
 * to the original page.
 */
export function createInitialPageOrder(totalPages) {
  if (!Number.isInteger(totalPages) || totalPages < 1) {
    return [];
  }

  return Array.from(
    { length: totalPages },
    (_, index) => ({
      id: `page-${index}-0`,
      sourceIndex: index,
      pageNumber: index + 1,
      rotation: 0,
    })
  );
}

/**
 * Normalize rotation to one of:
 * 0, 90, 180, 270
 */
export function normalizeRotation(rotation) {
  const numericRotation = Number(rotation);

  if (!Number.isFinite(numericRotation)) {
    return 0;
  }

  const normalized =
    ((numericRotation % 360) + 360) % 360;

  const snapped =
    Math.round(normalized / 90) * 90;

  return snapped === 360 ? 0 : snapped;
}

/**
 * Validate the page arrangement supplied by the UI.
 *
 * The array may contain the same sourceIndex more than once.
 * This intentionally allows duplicated pages.
 *
 * Example:
 *
 * [
 *   { sourceIndex: 2, rotation: 0 },
 *   { sourceIndex: 0, rotation: 90 },
 *   { sourceIndex: 0, rotation: 180 }
 * ]
 *
 * means:
 * Page 3
 * Page 1 rotated 90°
 * Page 1 duplicated and rotated 180°
 */
export function validatePageOrder(
  pageOrder,
  totalPages
) {
  if (!Array.isArray(pageOrder)) {
    throw new Error(
      "Invalid page arrangement."
    );
  }

  if (pageOrder.length === 0) {
    throw new Error(
      "At least one page must remain in the PDF."
    );
  }

  if (
    !Number.isInteger(totalPages) ||
    totalPages < 1
  ) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  return pageOrder.map((page, index) => {
    if (!page || typeof page !== "object") {
      throw new Error(
        `Page ${index + 1} contains invalid data.`
      );
    }

    const sourceIndex = Number(
      page.sourceIndex
    );

    if (
      !Number.isInteger(sourceIndex)
    ) {
      throw new Error(
        `Page ${index + 1} has an invalid source page.`
      );
    }

    if (
      sourceIndex < 0 ||
      sourceIndex >= totalPages
    ) {
      throw new Error(
        `Page ${index + 1} references a page that does not exist.`
      );
    }

    const rotation =
      normalizeRotation(page.rotation);

    return {
      sourceIndex,
      rotation,
    };
  });
}

/**
 * Organize a PDF according to the page arrangement.
 *
 * Supported through the pageOrder array:
 *
 * - Reorder pages
 * - Delete pages by omitting them
 * - Duplicate pages by repeating a sourceIndex
 * - Rotate pages by 90 / 180 / 270 degrees
 *
 * Each output page is copied from the original PDF,
 * preserving the original page contents while applying
 * the requested additional rotation.
 */
export async function organizePdf(
  file,
  pageOrder
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  const sourcePdf =
    await PDFDocument.load(fileBuffer);

  const totalPages =
    sourcePdf.getPageCount();

  const normalizedPageOrder =
    validatePageOrder(
      pageOrder,
      totalPages
    );

  const outputPdf =
    await PDFDocument.create();

  for (
    let index = 0;
    index < normalizedPageOrder.length;
    index += 1
  ) {
    const pageConfig =
      normalizedPageOrder[index];

    const copiedPages =
      await outputPdf.copyPages(
        sourcePdf,
        [pageConfig.sourceIndex]
      );

    const page = copiedPages[0];

    if (!page) {
      throw new Error(
        `Unable to copy source page ${
          pageConfig.sourceIndex + 1
        }.`
      );
    }

    /*
     * Keep the original page rotation and add
     * the user's requested rotation on top.
     */
    const originalRotation =
      normalizeRotation(
        page.getRotation().angle
      );

    const finalRotation =
      normalizeRotation(
        originalRotation +
          pageConfig.rotation
      );

    page.setRotation(
      degrees(finalRotation)
    );

    outputPdf.addPage(page);
  }

  const pdfBytes =
    await outputPdf.save();

  return new Blob(
    [pdfBytes],
    {
      type: "application/pdf",
    }
  );
}

/**
 * Convenience helper for creating a page model
 * after a PDF has already been loaded.
 */
export async function loadPageOrder(file) {
  const totalPages =
    await getPdfPageCount(file);

  return {
    totalPages,
    pages:
      createInitialPageOrder(
        totalPages
      ),
  };
}