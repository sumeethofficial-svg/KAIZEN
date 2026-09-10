import { PDFDocument, degrees } from "pdf-lib";

/**
 * Supported N-up layouts.
 */
const VALID_LAYOUTS = [2, 4, 6, 9, 16];

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
  };
}

/**
 * Validate pages-per-sheet value.
 */
export function validatePagesPerSheet(
  pagesPerSheet
) {
  const value = Number(pagesPerSheet);

  if (!VALID_LAYOUTS.includes(value)) {
    throw new Error(
      "Pages per sheet must be 2, 4, 6, 9, or 16."
    );
  }

  return value;
}

/**
 * Validate page orientation.
 */
function validateOrientation(
  orientation
) {
  if (
    orientation !== "portrait" &&
    orientation !== "landscape"
  ) {
    throw new Error(
      "Orientation must be portrait or landscape."
    );
  }

  return orientation;
}

/**
 * Calculate an appropriate grid for an N-up layout.
 *
 * Returns:
 * {
 *   columns,
 *   rows
 * }
 */
export function getLayoutGrid(
  pagesPerSheet
) {
  const value =
    validatePagesPerSheet(
      pagesPerSheet
    );

  switch (value) {
    case 2:
      return {
        columns: 1,
        rows: 2,
      };

    case 4:
      return {
        columns: 2,
        rows: 2,
      };

    case 6:
      return {
        columns: 2,
        rows: 3,
      };

    case 9:
      return {
        columns: 3,
        rows: 3,
      };

    case 16:
      return {
        columns: 4,
        rows: 4,
      };

    default:
      throw new Error(
        "Unsupported pages-per-sheet layout."
      );
  }
}

/**
 * Create a PDF with multiple source pages
 * placed onto each output sheet.
 *
 * Pages are scaled proportionally to fit
 * inside each grid cell.
 */
export async function createPagesPerSheetPdf(
  file,
  options = {},
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const pagesPerSheet =
    validatePagesPerSheet(
      options.pagesPerSheet ?? 4
    );

  const orientation =
    validateOrientation(
      options.orientation ?? "portrait"
    );

  const margin =
    Number(options.margin ?? 18);

  const gap =
    Number(options.gap ?? 10);

  if (!Number.isFinite(margin) || margin < 0) {
    throw new Error(
      "Margin must be zero or greater."
    );
  }

  if (!Number.isFinite(gap) || gap < 0) {
    throw new Error(
      "Gap must be zero or greater."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (typeof onProgress === "function") {
    onProgress(5);
  }

  const sourcePdf =
    await PDFDocument.load(
      fileBuffer
    );

  const totalPages =
    sourcePdf.getPageCount();

  if (totalPages < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  if (typeof onProgress === "function") {
    onProgress(15);
  }

  const outputPdf =
    await PDFDocument.create();

  const {
    columns,
    rows,
  } = getLayoutGrid(
    pagesPerSheet
  );

  const firstPage =
    sourcePdf.getPage(0);

  const sourceWidth =
    firstPage.getWidth();

  const sourceHeight =
    firstPage.getHeight();

  const sourceIsLandscape =
    sourceWidth > sourceHeight;

  const pageWidth =
    orientation === "landscape"
      ? 842
      : 595;

  const pageHeight =
    orientation === "landscape"
      ? 595
      : 842;

  const usableWidth =
    pageWidth -
    margin * 2 -
    gap * (columns - 1);

  const usableHeight =
    pageHeight -
    margin * 2 -
    gap * (rows - 1);

  const cellWidth =
    usableWidth / columns;

  const cellHeight =
    usableHeight / rows;

  const totalSheets =
    Math.ceil(
      totalPages /
        pagesPerSheet
    );

  let processedPages = 0;

  for (
    let sheetIndex = 0;
    sheetIndex < totalSheets;
    sheetIndex += 1
  ) {
    const outputPage =
      outputPdf.addPage([
        pageWidth,
        pageHeight,
      ]);

    for (
      let cellIndex = 0;
      cellIndex < pagesPerSheet;
      cellIndex += 1
    ) {
      const sourceIndex =
        sheetIndex *
          pagesPerSheet +
        cellIndex;

      if (
        sourceIndex >=
        totalPages
      ) {
        break;
      }

      const copiedPages =
        await outputPdf.copyPages(
          sourcePdf,
          [sourceIndex]
        );

      const embeddedPage =
        copiedPages[0];

      const sourcePage =
        sourcePdf.getPage(
          sourceIndex
        );

      const sourcePageWidth =
        sourcePage.getWidth();

      const sourcePageHeight =
        sourcePage.getHeight();

      const rotatedSource =
        sourcePage.getRotation()
          .angle % 180 !== 0;

      const effectiveWidth =
        rotatedSource
          ? sourcePageHeight
          : sourcePageWidth;

      const effectiveHeight =
        rotatedSource
          ? sourcePageWidth
          : sourcePageHeight;

      let scale =
        Math.min(
          cellWidth /
            effectiveWidth,
          cellHeight /
            effectiveHeight
        );

      if (
        !Number.isFinite(scale) ||
        scale <= 0
      ) {
        throw new Error(
          "Unable to calculate the page scaling."
        );
      }

      const renderedWidth =
        effectiveWidth * scale;

      const renderedHeight =
        effectiveHeight * scale;

      const column =
        cellIndex % columns;

      const row =
        Math.floor(
          cellIndex /
            columns
        );

      const x =
        margin +
        column *
          (cellWidth + gap) +
        (cellWidth -
          renderedWidth) /
          2;

      const y =
        pageHeight -
        margin -
        (row + 1) *
          cellHeight -
        row * gap +
        (cellHeight -
          renderedHeight) /
          2;

      const rotation =
        rotatedSource
          ? degrees(
              normalizePageRotation(
                sourcePage
                  .getRotation()
                  .angle
              )
            )
          : degrees(0);

      outputPage.drawPage(
        embeddedPage,
        {
          x,
          y,
          width: renderedWidth,
          height: renderedHeight,
          rotate: rotation,
        }
      );

      processedPages += 1;

      if (typeof onProgress === "function") {
        const percentage =
          15 +
          Math.round(
            (processedPages /
              totalPages) *
              75
          );

        onProgress(
          Math.min(
            90,
            percentage
          )
        );
      }
    }
  }

  if (typeof onProgress === "function") {
    onProgress(94);
  }

  const pdfBytes =
    await outputPdf.save({
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
    originalPageCount:
      totalPages,
    outputPageCount:
      totalSheets,
    pagesPerSheet,
    orientation,
    columns,
    rows,
    sourceOrientation:
      sourceIsLandscape
        ? "landscape"
        : "portrait",
  };
}

/**
 * Normalize an arbitrary PDF rotation
 * to the nearest supported 90-degree value.
 */
function normalizePageRotation(
  rotation
) {
  const numericRotation =
    Number(rotation);

  if (
    !Number.isFinite(
      numericRotation
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      numericRotation / 90
    ) *
    90
  );
}