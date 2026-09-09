import { PDFDocument } from "pdf-lib";

export async function mergePdfFiles(files) {
  if (!files || files.length < 2) {
    throw new Error("Please select at least two PDF files.");
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const fileBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(fileBuffer);

    const pages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );

    pages.forEach((page) => {
      mergedPdf.addPage(page);
    });
  }

  const mergedPdfBytes = await mergedPdf.save();

  return new Blob([mergedPdfBytes], {
    type: "application/pdf",
  });
}