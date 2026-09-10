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
 * Validate the requested mixing order.
 */
function validateOrder(order) {
  if (
    order !== "first-first" &&
    order !== "second-first"
  ) {
    throw new Error(
      "Invalid mixing order."
    );
  }

  return order;
}

/**
 * Alternate pages from two PDFs.
 *
 * Example:
 * PDF A: A1 A2 A3 A4
 * PDF B: B1 B2 B3
 *
 * Result:
 * A1 B1 A2 B2 A3 B3 A4
 *
 * If order = "second-first":
 * B1 A1 B2 A2 B3 A3 A4
 */
export async function alternateAndMix(
  firstFile,
  secondFile,
  order = "first-first",
  onProgress
) {
  if (!firstFile) {
    throw new Error(
      "Please provide the first PDF."
    );
  }

  if (!secondFile) {
    throw new Error(
      "Please provide the second PDF."
    );
  }

  const firstIsPdf =
    firstFile.type === "application/pdf" ||
    firstFile.name
      .toLowerCase()
      .endsWith(".pdf");

  const secondIsPdf =
    secondFile.type === "application/pdf" ||
    secondFile.name
      .toLowerCase()
      .endsWith(".pdf");

  if (!firstIsPdf || !secondIsPdf) {
    throw new Error(
      "Both files must be valid PDF documents."
    );
  }

  const normalizedOrder =
    validateOrder(order);

  if (typeof onProgress === "function") {
    onProgress(5);
  }

  const firstBuffer =
    await firstFile.arrayBuffer();

  const secondBuffer =
    await secondFile.arrayBuffer();

  if (typeof onProgress === "function") {
    onProgress(15);
  }

  const firstPdf =
    await PDFDocument.load(firstBuffer);

  const secondPdf =
    await PDFDocument.load(secondBuffer);

  const firstPageCount =
    firstPdf.getPageCount();

  const secondPageCount =
    secondPdf.getPageCount();

  if (firstPageCount < 1) {
    throw new Error(
      "The first PDF does not contain any pages."
    );
  }

  if (secondPageCount < 1) {
    throw new Error(
      "The second PDF does not contain any pages."
    );
  }

  if (typeof onProgress === "function") {
    onProgress(25);
  }

  const outputPdf =
    await PDFDocument.create();

  const maxPageCount = Math.max(
    firstPageCount,
    secondPageCount
  );

  const totalOutputPages =
    firstPageCount +
    secondPageCount;

  let completedPages = 0;

  for (
    let index = 0;
    index < maxPageCount;
    index += 1
  ) {
    const firstExists =
      index < firstPageCount;

    const secondExists =
      index < secondPageCount;

    if (
      normalizedOrder ===
      "first-first"
    ) {
      if (firstExists) {
        const copiedPages =
          await outputPdf.copyPages(
            firstPdf,
            [index]
          );

        outputPdf.addPage(
          copiedPages[0]
        );

        completedPages += 1;

        reportProgress(
          onProgress,
          completedPages,
          totalOutputPages
        );
      }

      if (secondExists) {
        const copiedPages =
          await outputPdf.copyPages(
            secondPdf,
            [index]
          );

        outputPdf.addPage(
          copiedPages[0]
        );

        completedPages += 1;

        reportProgress(
          onProgress,
          completedPages,
          totalOutputPages
        );
      }
    } else {
      if (secondExists) {
        const copiedPages =
          await outputPdf.copyPages(
            secondPdf,
            [index]
          );

        outputPdf.addPage(
          copiedPages[0]
        );

        completedPages += 1;

        reportProgress(
          onProgress,
          completedPages,
          totalOutputPages
        );
      }

      if (firstExists) {
        const copiedPages =
          await outputPdf.copyPages(
            firstPdf,
            [index]
          );

        outputPdf.addPage(
          copiedPages[0]
        );

        completedPages += 1;

        reportProgress(
          onProgress,
          completedPages,
          totalOutputPages
        );
      }
    }
  }

  if (typeof onProgress === "function") {
    onProgress(95);
  }

  const pdfBytes =
    await outputPdf.save();

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
    firstPageCount,
    secondPageCount,
    outputPageCount:
      totalOutputPages,
    order: normalizedOrder,
  };
}

function reportProgress(
  onProgress,
  completedPages,
  totalPages
) {
  if (typeof onProgress !== "function") {
    return;
  }

  if (totalPages <= 0) {
    return;
  }

  const percentage =
    25 +
    Math.round(
      (completedPages / totalPages) *
        65
    );

  onProgress(
    Math.min(90, percentage)
  );
}