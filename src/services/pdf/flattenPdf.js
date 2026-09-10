import { PDFDocument } from "pdf-lib";

/**
 * Get basic PDF information.
 */
export async function getFlattenPdfInfo(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return {
    fileName: file.name,
    pageCount: pdfDoc.getPageCount(),
    size: file.size,
    fieldCount: fields.length,
    hasFormFields: fields.length > 0,
  };
}

/**
 * Flatten all AcroForm fields in a PDF.
 *
 * After flattening, form fields become part of the page content
 * and can no longer be edited as interactive form fields.
 */
export async function flattenPdf(file, onProgress) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  if (totalPages === 0) {
    throw new Error("The PDF contains no pages.");
  }

  onProgress?.({
    current: 0,
    total: totalPages,
    percent: 0,
  });

  if (fields.length > 0) {
    form.flatten();
  }

  for (let index = 0; index < totalPages; index += 1) {
    const pageNumber = index + 1;

    onProgress?.({
      current: pageNumber,
      total: totalPages,
      percent: Math.round((pageNumber / totalPages) * 100),
    });
  }

  const outputBytes = await pdfDoc.save();

  if (!outputBytes || outputBytes.length === 0) {
    throw new Error("Failed to generate the flattened PDF.");
  }

  return new Blob([outputBytes], {
    type: "application/pdf",
  });
}