import mammoth from "mammoth";
import html2pdf from "html2pdf.js";

const SUPPORTED_EXTENSIONS = [
  "docx",
  "txt",
  "html",
  "htm",
  "md",
];

function getExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeHtml(html) {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");

  document
    .querySelectorAll("script, iframe, object, embed, form, base")
    .forEach((element) => element.remove());

  document.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.toLowerCase().trim();

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
      }

      if (
        ["href", "src", "action", "formaction"].includes(name) &&
        value.startsWith("javascript:")
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return document.body.innerHTML;
}

async function convertDocx(file) {
  const arrayBuffer = await file.arrayBuffer();

  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Title'] => h1",
        "p[style-name='Subtitle'] => h2",
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3",
        "p[style-name='Quote'] => blockquote",
      ],
    }
  );

  return {
    html: sanitizeHtml(result.value),
    warnings: result.messages || [],
  };
}

async function convertText(file) {
  const text = await file.text();

  const html = text
    .split(/\r?\n\r?\n/)
    .map((paragraph) => {
      const formatted = escapeHtml(paragraph).replace(
        /\r?\n/g,
        "<br />"
      );

      return `<p>${formatted}</p>`;
    })
    .join("");

  return {
    html,
    warnings: [],
  };
}

async function convertHtml(file) {
  const text = await file.text();

  return {
    html: sanitizeHtml(text),
    warnings: [],
  };
}

async function convertMarkdown(file) {
  const text = await file.text();

  let html = escapeHtml(text);

  html = html.replace(
    /^### (.+)$/gm,
    "<h3>$1</h3>"
  );

  html = html.replace(
    /^## (.+)$/gm,
    "<h2>$1</h2>"
  );

  html = html.replace(
    /^# (.+)$/gm,
    "<h1>$1</h1>"
  );

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /\*(.*?)\*/g,
    "<em>$1</em>"
  );

  html = html.replace(
    /\r?\n/g,
    "<br />"
  );

  return {
    html: `<div>${html}</div>`,
    warnings: [],
  };
}

export async function loadDocument(file) {
  if (!file) {
    throw new Error("No document selected.");
  }

  const extension = getExtension(file.name);

  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      "Unsupported document type. Use DOCX, TXT, HTML, HTM, or MD."
    );
  }

  switch (extension) {
    case "docx":
      return convertDocx(file);

    case "txt":
      return convertText(file);

    case "html":
    case "htm":
      return convertHtml(file);

    case "md":
      return convertMarkdown(file);

    default:
      throw new Error("Unsupported document type.");
  }
}

export async function documentToPdf(element, options = {}) {
  if (!element) {
    throw new Error("Document preview is not available.");
  }

  const {
    pageSize = "a4",
    orientation = "portrait",
    margin = 0.55,
    quality = 0.95,
    filename = "document.pdf",
  } = options;

  const pdfOptions = {
    margin,
    filename,

    image: {
      type: "jpeg",
      quality,
    },

    html2canvas: {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    },

    pagebreak: {
      mode: ["css", "legacy"],
      avoid: [
        "img",
        "table",
        "tr",
        "blockquote",
      ],
    },

    jsPDF: {
      unit: "in",
      format: pageSize,
      orientation,
      compress: true,
    },
  };

  return html2pdf()
    .set(pdfOptions)
    .from(element)
    .outputPdf("blob");
}

export function getSupportedExtensions() {
  return [...SUPPORTED_EXTENSIONS];
}