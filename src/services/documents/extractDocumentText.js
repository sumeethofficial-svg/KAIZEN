import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const SUPPORTED_EXTENSIONS = [
  "txt",
  "md",
  "html",
  "htm",
  "docx",
  "pdf",
];

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function stripHtml(html) {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    html,
    "text/html"
  );

  document
    .querySelectorAll(
      "script, style, noscript, iframe, object, embed"
    )
    .forEach((element) => element.remove());

  return document.body.textContent
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractTextFile(file) {
  return file.text();
}

async function extractHtmlFile(file) {
  const html = await file.text();
  return stripHtml(html);
}

async function extractDocxFile(file) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return result.value.trim();
}

async function extractPdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
  }).promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber++
  ) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();

    const pageText = content.items
      .map((item) => item.str || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join("\n\n").trim();
}

export async function extractDocumentText(file) {
  if (!file) {
    throw new Error("No document selected.");
  }

  const extension = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      "Unsupported file type. Use TXT, MD, HTML, DOCX, or PDF."
    );
  }

  switch (extension) {
    case "txt":
    case "md":
      return extractTextFile(file);

    case "html":
    case "htm":
      return extractHtmlFile(file);

    case "docx":
      return extractDocxFile(file);

    case "pdf":
      return extractPdfFile(file);

    default:
      throw new Error("Unsupported document type.");
  }
}

export function getSupportedDocumentExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}