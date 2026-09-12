import mammoth from "mammoth";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const SUPPORTED_EXTENSIONS = [
  "pdf",
  "docx",
  "pptx",
  "txt",
  "md",
  "html",
  "htm",
  "csv",
  "json",
  "xml",
  "rtf",
];

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function countText(text = "") {
  const normalized = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const words = normalized
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const characters = normalized.length;

  const charactersWithoutSpaces = normalized.replace(
    /\s/g,
    ""
  ).length;

  const lines =
    normalized.length === 0
      ? 0
      : normalized.split("\n").length;

  const sentences = normalized
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;

  return {
    words: words.length,
    characters,
    charactersWithoutSpaces,
    lines,
    sentences,
  };
}

async function extractPdfText(file) {
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

  return pages.join("\n\n");
}

async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.extractRawText({
    arrayBuffer,
  });

  return result.value || "";
}

function extractHtmlText(html) {
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

  return document.body?.textContent || "";
}

async function extractPptxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const slideFiles = Object.keys(zip.files)
    .filter(
      (name) =>
        /^ppt\/slides\/slide\d+\.xml$/i.test(name)
    )
    .sort((a, b) => {
      const aNumber = Number(
        a.match(/slide(\d+)\.xml/i)?.[1] || 0
      );

      const bNumber = Number(
        b.match(/slide(\d+)\.xml/i)?.[1] || 0
      );

      return aNumber - bNumber;
    });

  const slides = [];

  for (const slideFile of slideFiles) {
    const xml = await zip.files[slideFile].async("text");

    const parser = new DOMParser();
    const document = parser.parseFromString(
      xml,
      "application/xml"
    );

    const textNodes = [
      ...document.getElementsByTagName("a:t"),
    ];

    const slideText = textNodes
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (slideText) {
      slides.push(slideText);
    }
  }

  return slides.join("\n\n");
}

function extractRtfText(rtf) {
  return rtf
    .replace(/\\par[d]?/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, "")
    .replace(/\\[a-z]+\d* ?/gi, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\n\s+/g, "\n")
    .trim();
}

async function extractPlainText(file) {
  return file.text();
}

async function extractFileText(file) {
  const extension = getExtension(file.name);

  switch (extension) {
    case "pdf":
      return extractPdfText(file);

    case "docx":
      return extractDocxText(file);

    case "pptx":
      return extractPptxText(file);

    case "html":
    case "htm": {
      const html = await file.text();
      return extractHtmlText(html);
    }

    case "rtf": {
      const rtf = await file.text();
      return extractRtfText(rtf);
    }

    case "txt":
    case "md":
    case "csv":
    case "json":
    case "xml":
      return extractPlainText(file);

    default:
      throw new Error(
        "This file type is not supported. Please use a readable text-based file."
      );
  }
}

export async function countDocumentWords(file) {
  if (!file) {
    throw new Error("No file selected.");
  }

  const extension = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      "Unsupported file type. Supported: PDF, DOCX, PPTX, TXT, MD, HTML, CSV, JSON, XML and RTF."
    );
  }

  const text = await extractFileText(file);

  return {
    text,
    stats: countText(text),
    extension,
  };
}

export function getSupportedWordCounterExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}