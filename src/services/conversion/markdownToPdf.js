import { marked } from "marked";
import DOMPurify from "dompurify";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

marked.setOptions({
  gfm: true,
  breaks: true,
});

function waitForImages(container) {
  const images = Array.from(container.querySelectorAll("img"));

  if (!images.length) {
    return Promise.resolve();
  }

  return Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })
    )
  );
}

function createRenderContainer(html, options) {
  const wrapper = document.createElement("div");

  wrapper.setAttribute("data-kaizen-markdown-render", "true");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = `${options.renderWidth}px`;
  wrapper.style.boxSizing = "border-box";
  wrapper.style.padding = `${options.padding}px`;
  wrapper.style.background = options.backgroundColor;
  wrapper.style.color = options.textColor;
  wrapper.style.fontFamily = options.fontFamily;
  wrapper.style.fontSize = `${options.fontSize}px`;
  wrapper.style.lineHeight = String(options.lineHeight);
  wrapper.style.wordBreak = "break-word";
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = "-1";

  wrapper.innerHTML = `
    <style>
      [data-kaizen-markdown-render] {
        box-sizing: border-box;
      }

      [data-kaizen-markdown-render] * {
        box-sizing: border-box;
      }

      [data-kaizen-markdown-render] h1,
      [data-kaizen-markdown-render] h2,
      [data-kaizen-markdown-render] h3,
      [data-kaizen-markdown-render] h4,
      [data-kaizen-markdown-render] h5,
      [data-kaizen-markdown-render] h6 {
        margin-top: 0;
        margin-bottom: 0.6em;
        line-height: 1.2;
        color: ${options.headingColor};
        page-break-inside: avoid;
      }

      [data-kaizen-markdown-render] h1 {
        font-size: 2em;
      }

      [data-kaizen-markdown-render] h2 {
        font-size: 1.65em;
      }

      [data-kaizen-markdown-render] h3 {
        font-size: 1.4em;
      }

      [data-kaizen-markdown-render] h4 {
        font-size: 1.2em;
      }

      [data-kaizen-markdown-render] h5 {
        font-size: 1.05em;
      }

      [data-kaizen-markdown-render] h6 {
        font-size: 1em;
      }

      [data-kaizen-markdown-render] p {
        margin-top: 0;
        margin-bottom: 1em;
      }

      [data-kaizen-markdown-render] ul,
      [data-kaizen-markdown-render] ol {
        margin-top: 0;
        margin-bottom: 1em;
        padding-left: 1.7em;
      }

      [data-kaizen-markdown-render] li {
        margin-bottom: 0.35em;
      }

      [data-kaizen-markdown-render] blockquote {
        margin: 1em 0;
        padding: 0.8em 1em;
        border-left: 4px solid ${options.accentColor};
        background: ${options.quoteBackground};
        color: ${options.mutedTextColor};
        page-break-inside: avoid;
      }

      [data-kaizen-markdown-render] code {
        padding: 0.15em 0.35em;
        border-radius: 4px;
        background: ${options.codeBackground};
        font-family: "Courier New", monospace;
        font-size: 0.92em;
      }

      [data-kaizen-markdown-render] pre {
        margin: 1em 0;
        padding: 1em;
        overflow: hidden;
        border-radius: 6px;
        background: ${options.codeBackground};
        color: ${options.codeTextColor};
        white-space: pre-wrap;
        word-break: break-word;
        page-break-inside: avoid;
      }

      [data-kaizen-markdown-render] pre code {
        padding: 0;
        background: transparent;
        color: inherit;
      }

      [data-kaizen-markdown-render] table {
        width: 100%;
        margin: 1em 0;
        border-collapse: collapse;
        page-break-inside: avoid;
      }

      [data-kaizen-markdown-render] th,
      [data-kaizen-markdown-render] td {
        padding: 0.55em 0.7em;
        border: 1px solid ${options.borderColor};
        text-align: left;
        vertical-align: top;
      }

      [data-kaizen-markdown-render] th {
        background: ${options.tableHeaderBackground};
        font-weight: 700;
      }

      [data-kaizen-markdown-render] hr {
        margin: 1.5em 0;
        border: 0;
        border-top: 1px solid ${options.borderColor};
      }

      [data-kaizen-markdown-render] a {
        color: ${options.linkColor};
        text-decoration: underline;
      }

      [data-kaizen-markdown-render] img {
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0.75em 0;
      }

      [data-kaizen-markdown-render] input[type="checkbox"] {
        margin-right: 0.4em;
      }

      [data-kaizen-markdown-render] del {
        text-decoration: line-through;
      }

      [data-kaizen-markdown-render] strong {
        font-weight: 700;
      }

      [data-kaizen-markdown-render] em {
        font-style: italic;
      }
    </style>

    <div class="kaizen-markdown-content">
      ${html}
    </div>
  `;

  document.body.appendChild(wrapper);

  return wrapper;
}

function getPdfFormat(format) {
  switch (format) {
    case "a3":
      return "a3";
    case "letter":
      return "letter";
    case "legal":
      return "legal";
    case "a4":
    default:
      return "a4";
  }
}

export async function markdownToPdf(
  markdown,
  {
    fileName = "markdown-document.pdf",
    pageSize = "a4",
    orientation = "portrait",
    margin = 18,
    fontFamily = "Arial",
    fontSize = 16,
    lineHeight = 1.6,
    backgroundColor = "#ffffff",
    textColor = "#1b1b1b",
    headingColor = "#111111",
    accentColor = "#f97316",
    quoteBackground = "#f5f5f5",
    mutedTextColor = "#555555",
    codeBackground = "#f1f1f1",
    codeTextColor = "#202020",
    borderColor = "#d0d0d0",
    tableHeaderBackground = "#eeeeee",
    linkColor = "#c2410c",
    imageQuality = 0.95,
    onProgress,
  } = {}
) {
  if (typeof markdown !== "string" || !markdown.trim()) {
    throw new Error("Markdown content is empty.");
  }

  onProgress?.({
    stage: "parsing",
    progress: 10,
    message: "Parsing Markdown...",
  });

  const rawHtml = marked.parse(markdown);

  onProgress?.({
    stage: "sanitizing",
    progress: 20,
    message: "Securing document content...",
  });

  const sanitizedHtml = DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: {
      html: true,
    },
  });

  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: getPdfFormat(pageSize),
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const safeMargin = Math.max(24, Number(margin) || 18);

  const renderWidth = Math.max(
    300,
    Math.floor(pageWidth - safeMargin * 2)
  );

  const wrapper = createRenderContainer(sanitizedHtml, {
    renderWidth,
    padding: 0,
    backgroundColor,
    textColor,
    fontFamily,
    fontSize,
    lineHeight,
    headingColor,
    accentColor,
    quoteBackground,
    mutedTextColor,
    codeBackground,
    codeTextColor,
    borderColor,
    tableHeaderBackground,
    linkColor,
  });

  try {
    onProgress?.({
      stage: "rendering",
      progress: 35,
      message: "Rendering document...",
    });

    await waitForImages(wrapper);

    const canvas = await html2canvas(wrapper, {
      backgroundColor,
      scale: Math.min(window.devicePixelRatio || 1, 2),
      useCORS: true,
      allowTaint: false,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: wrapper.scrollWidth,
      windowHeight: wrapper.scrollHeight,
      onclone: (clonedDocument) => {
        const clonedWrapper = clonedDocument.querySelector(
          '[data-kaizen-markdown-render="true"]'
        );

        if (clonedWrapper) {
          clonedWrapper.style.left = "0";
          clonedWrapper.style.top = "0";
          clonedWrapper.style.position = "relative";
        }
      },
    });

    if (!canvas.width || !canvas.height) {
      throw new Error("Unable to render Markdown content.");
    }

    onProgress?.({
      stage: "building",
      progress: 55,
      message: "Building PDF pages...",
    });

    const imageData = canvas.toDataURL("image/jpeg", imageQuality);

    const imageWidth = pageWidth - safeMargin * 2;
    const imageHeight =
      (canvas.height * imageWidth) / canvas.width;

    const contentHeight = pageHeight - safeMargin * 2;

    let remainingHeight = imageHeight;
    let sourceY = 0;
    let pageIndex = 0;

    while (remainingHeight > 0) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const visibleHeight = Math.min(
        contentHeight,
        remainingHeight
      );

      const sourcePixelHeight =
        (visibleHeight / imageHeight) * canvas.height;

      const sourceYRatio = sourceY / imageHeight;

      pdf.addImage(
        imageData,
        "JPEG",
        safeMargin,
        safeMargin - sourceYRatio * imageHeight,
        imageWidth,
        imageHeight
      );

      remainingHeight -= visibleHeight;
      sourceY += visibleHeight;
      pageIndex += 1;

      const progress =
        55 +
        Math.min(
          40,
          Math.round(
            (1 - Math.max(remainingHeight, 0) / imageHeight) * 40
          )
        );

      onProgress?.({
        stage: "building",
        progress,
        message: `Building page ${pageIndex}...`,
        page: pageIndex,
      });

      if (sourcePixelHeight <= 0) {
        break;
      }
    }

    onProgress?.({
      stage: "finalizing",
      progress: 97,
      message: "Finalizing PDF...",
    });

    const outputName = fileName.endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

    const blob = pdf.output("blob");

    onProgress?.({
      stage: "complete",
      progress: 100,
      message: "PDF ready.",
    });

    return {
      blob,
      fileName: outputName,
      pageCount: pdf.getNumberOfPages(),
      byteSize: blob.size,
    };
  } finally {
    wrapper.remove();
  }
}

export function markdownToHtml(markdown) {
  if (typeof markdown !== "string") {
    return "";
  }

  const rawHtml = marked.parse(markdown);

  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: {
      html: true,
    },
  });
}