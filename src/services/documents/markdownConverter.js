import { marked } from "marked";
import DOMPurify from "dompurify";
import html2pdf from "html2pdf.js";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export async function markdownToHtml(file) {
  if (!file) {
    throw new Error("No Markdown file selected.");
  }

  const markdown = await file.text();
  const html = marked.parse(markdown);

  return {
    markdown,
    html: DOMPurify.sanitize(html),
  };
}

export async function markdownToPdf(file, options = {}) {
  const result = await markdownToHtml(file);

  const container = document.createElement("div");

  container.style.width = "100%";
  container.style.padding = "45px";
  container.style.boxSizing = "border-box";
  container.style.background = "#ffffff";
  container.style.color = "#111111";
  container.style.fontFamily =
    "Arial, Helvetica, sans-serif";
  container.style.fontSize = "14px";
  container.style.lineHeight = "1.6";

  container.innerHTML = result.html;

  document.body.appendChild(container);

  try {
    return await html2pdf()
      .set({
        margin: options.margin ?? 0.55,
        filename: options.filename || "markdown.pdf",

        image: {
          type: "jpeg",
          quality: 0.95,
        },

        html2canvas: {
          scale: 2,
          backgroundColor: "#ffffff",
        },

        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["table", "pre", "blockquote"],
        },

        jsPDF: {
          unit: "in",
          format: options.pageSize || "a4",
          orientation: options.orientation || "portrait",
          compress: true,
        },
      })
      .from(container)
      .outputPdf("blob");
  } finally {
    container.remove();
  }
}

export async function markdownToText(file) {
  if (!file) {
    throw new Error("No Markdown file selected.");
  }

  return file.text();
}