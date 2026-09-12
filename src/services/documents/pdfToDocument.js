import * as pdfjsLib from "pdfjs-dist";
import { Document, Packer, Paragraph, TextRun } from "docx";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

export async function extractPdfText(file) {
  if (!file) {
    throw new Error("No PDF selected.");
  }

  if (file.type !== "application/pdf") {
    throw new Error("Please select a PDF file.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const text = content.items
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({
      pageNumber,
      text,
    });
  }

  return {
    pageCount: pdf.numPages,
    pages,
    text: pages
      .map((page) => page.text)
      .filter(Boolean)
      .join("\n\n"),
  };
}

export async function pdfToDocx(file, options = {}) {
  const extracted = await extractPdfText(file);

  const children = [];

  extracted.pages.forEach((page) => {
    if (page.pageNumber > 1) {
      children.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Page ${page.pageNumber}`,
            bold: true,
            size: 22,
          }),
        ],
        spacing: {
          after: 200,
        },
      })
    );

    const paragraphs = page.text
      .split(/\n+/)
      .map((text) => text.trim())
      .filter(Boolean);

    if (paragraphs.length === 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "",
            }),
          ],
        })
      );
      return;
    }

    paragraphs.forEach((text) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text,
              size: 22,
            }),
          ],
          spacing: {
            after: 160,
          },
        })
      );
    });
  });

  const document = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(document);

  return {
    blob,
    pageCount: extracted.pageCount,
    filename: options.filename || "converted-document.docx",
    text: extracted.text,
  };
}

export async function pdfToTxt(file, options = {}) {
  const extracted = await extractPdfText(file);

  const blob = new Blob([extracted.text], {
    type: "text/plain;charset=utf-8",
  });

  return {
    blob,
    pageCount: extracted.pageCount,
    filename: options.filename || "converted-document.txt",
    text: extracted.text,
  };
}