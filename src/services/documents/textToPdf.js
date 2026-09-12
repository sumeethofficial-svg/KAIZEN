import html2pdf from "html2pdf.js";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function textToPdf(file, options = {}) {
  if (!file) {
    throw new Error("No text file selected.");
  }

  const text = await file.text();

  const html = text
    .split(/\r?\n\r?\n/)
    .map((paragraph) => {
      const content = escapeHtml(paragraph).replace(
        /\r?\n/g,
        "<br />"
      );

      return `<p>${content}</p>`;
    })
    .join("");

  const container = document.createElement("div");

  container.style.width = "100%";
  container.style.padding = "40px";
  container.style.boxSizing = "border-box";
  container.style.background = "#ffffff";
  container.style.color = "#111111";
  container.style.fontFamily =
    "Arial, Helvetica, sans-serif";
  container.style.fontSize = "14px";
  container.style.lineHeight = "1.6";

  container.innerHTML = html || "<p></p>";

  document.body.appendChild(container);

  try {
    const blob = await html2pdf()
      .set({
        margin: options.margin ?? 0.55,
        filename: options.filename || "text.pdf",

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

    return blob;
  } finally {
    container.remove();
  }
}