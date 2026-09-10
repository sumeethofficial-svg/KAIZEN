import { PDFDocument } from "pdf-lib";

/**
 * Get the existing PDF metadata.
 */
export async function getEditMetadataPdfInfo(file) {
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

  return {
    fileName: file.name,
    pageCount: pdfDoc.getPageCount(),
    size: file.size,

    metadata: {
      title: pdfDoc.getTitle() || "",
      author: pdfDoc.getAuthor() || "",
      subject: pdfDoc.getSubject() || "",
      keywords: pdfDoc.getKeywords() || "",
      creator: pdfDoc.getCreator() || "",
      producer: pdfDoc.getProducer() || "",
      creationDate: pdfDoc.getCreationDate() || null,
      modificationDate:
        pdfDoc.getModificationDate() || null,
    },
  };
}

/**
 * Create normalized metadata options.
 */
export function createEditMetadataOptions(options = {}) {
  return {
    title: String(options.title ?? ""),
    author: String(options.author ?? ""),
    subject: String(options.subject ?? ""),
    keywords: String(options.keywords ?? ""),
    creator: String(options.creator ?? ""),
    producer: String(options.producer ?? ""),

    creationDate:
      options.creationDate instanceof Date &&
      !Number.isNaN(options.creationDate.getTime())
        ? options.creationDate
        : null,

    modificationDate:
      options.modificationDate instanceof Date &&
      !Number.isNaN(options.modificationDate.getTime())
        ? options.modificationDate
        : null,
  };
}

/**
 * Update PDF metadata.
 */
export async function editMetadata(
  file,
  options = {},
  onProgress
) {
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

  const metadata = createEditMetadataOptions(options);

  const totalSteps = 8;
  let currentStep = 0;

  function reportProgress() {
    currentStep += 1;

    onProgress?.({
      current: currentStep,
      total: totalSteps,
      percent: Math.round(
        (currentStep / totalSteps) * 100
      ),
    });
  }

  pdfDoc.setTitle(metadata.title);
  reportProgress();

  pdfDoc.setAuthor(metadata.author);
  reportProgress();

  pdfDoc.setSubject(metadata.subject);
  reportProgress();

  pdfDoc.setKeywords(
    metadata.keywords
      ? metadata.keywords
          .split(",")
          .map((keyword) => keyword.trim())
          .filter(Boolean)
      : []
  );
  reportProgress();

  pdfDoc.setCreator(metadata.creator);
  reportProgress();

  pdfDoc.setProducer(metadata.producer);
  reportProgress();

  if (metadata.creationDate) {
    pdfDoc.setCreationDate(metadata.creationDate);
  }

  if (metadata.modificationDate) {
    pdfDoc.setModificationDate(
      metadata.modificationDate
    );
  }

  reportProgress();

  const outputBytes = await pdfDoc.save();

  reportProgress();

  if (!outputBytes || outputBytes.length === 0) {
    throw new Error(
      "Failed to generate the updated PDF."
    );
  }

  return new Blob([outputBytes], {
    type: "application/pdf",
  });
}