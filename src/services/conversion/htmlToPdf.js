import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const SUPPORTED_EXTENSIONS = [".html", ".htm"];

const PAGE_SIZES_MM = {
  A4: {
    portrait: { width: 210, height: 297 },
    landscape: { width: 297, height: 210 },
  },
  A3: {
    portrait: { width: 297, height: 420 },
    landscape: { width: 420, height: 297 },
  },
  Letter: {
    portrait: { width: 215.9, height: 279.4 },
    landscape: { width: 279.4, height: 215.9 },
  },
  Legal: {
    portrait: { width: 215.9, height: 355.6 },
    landscape: { width: 355.6, height: 215.9 },
  },
};

function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot).toLowerCase();
}

function isSupportedHtmlFile(file) {
  if (!(file instanceof File)) {
    return false;
  }

  return SUPPORTED_EXTENSIONS.includes(
    getFileExtension(file.name),
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizePageSize(pageSize) {
  return PAGE_SIZES_MM[pageSize]
    ? pageSize
    : "A4";
}

function normalizeOrientation(orientation) {
  if (
    orientation === "portrait" ||
    orientation === "landscape"
  ) {
    return orientation;
  }

  return "portrait";
}

function getPageDimensions(
  pageSize,
  orientation,
) {
  const safePageSize =
    normalizePageSize(pageSize);

  const safeOrientation =
    normalizeOrientation(orientation);

  return PAGE_SIZES_MM[safePageSize][safeOrientation];
}

function createRenderContainer(html) {
  const wrapper = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = "1200px";
  wrapper.style.minHeight = "100px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#111111";
  wrapper.style.overflow = "visible";
  wrapper.style.zIndex = "-1";

  const shadowHost = document.createElement("div");

  shadowHost.innerHTML = html;

  while (shadowHost.firstChild) {
    wrapper.appendChild(
      shadowHost.firstChild,
    );
  }

  document.body.appendChild(wrapper);

  return wrapper;
}

async function waitForRenderResources(container) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if font readiness cannot be detected.
    }
  }

  const images =
    Array.from(
      container.querySelectorAll("img"),
    );

  if (images.length === 0) {
    return;
  }

  await Promise.all(
    images.map(
      (image) =>
        new Promise((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }

          image.addEventListener(
            "load",
            resolve,
            { once: true },
          );

          image.addEventListener(
            "error",
            resolve,
            { once: true },
          );
        }),
    ),
  );
}

function prepareCloneForPdf(container) {
  const clonedNodes =
    Array.from(
      container.querySelectorAll("*"),
    );

  clonedNodes.forEach((element) => {
    if (
      element instanceof HTMLAnchorElement &&
      element.target === "_blank"
    ) {
      element.removeAttribute("target");
    }

    if (
      element instanceof HTMLImageElement
    ) {
      element.style.maxWidth = "100%";
      element.style.height = "auto";
    }

    if (
      element instanceof HTMLVideoElement
    ) {
      element.style.maxWidth = "100%";
    }
  });
}

function calculateScale(
  canvasWidth,
  canvasHeight,
  pageWidth,
  pageHeight,
  margin,
) {
  const usableWidth =
    pageWidth - margin * 2;

  const usableHeight =
    pageHeight - margin * 2;

  return Math.min(
    usableWidth / canvasWidth,
    usableHeight / canvasHeight,
  );
}

function addCanvasPage(
  pdf,
  canvas,
  pageWidth,
  pageHeight,
  margin,
  imageType,
  imageQuality,
) {
  const scale = calculateScale(
    canvas.width,
    canvas.height,
    pageWidth,
    pageHeight,
    margin,
  );

  const renderWidth =
    canvas.width * scale;

  const renderHeight =
    canvas.height * scale;

  const x =
    (pageWidth - renderWidth) / 2;

  const y =
    margin;

  const imageData =
    canvas.toDataURL(
      imageType,
      imageQuality,
    );

  pdf.addImage(
    imageData,
    imageType === "image/jpeg"
      ? "JPEG"
      : "PNG",
    x,
    y,
    renderWidth,
    renderHeight,
    undefined,
    "FAST",
  );
}

function splitCanvasIntoPages(
  sourceCanvas,
  pagePixelHeight,
  overlap = 0,
) {
  const pages = [];

  let offset = 0;

  while (
    offset < sourceCanvas.height
  ) {
    const remainingHeight =
      sourceCanvas.height - offset;

    const currentHeight = Math.min(
      pagePixelHeight,
      remainingHeight,
    );

    const pageCanvas =
      document.createElement("canvas");

    pageCanvas.width =
      sourceCanvas.width;

    pageCanvas.height =
      currentHeight;

    const context =
      pageCanvas.getContext("2d");

    if (!context) {
      throw new Error(
        "Your browser does not support canvas rendering.",
      );
    }

    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      pageCanvas.width,
      pageCanvas.height,
    );

    context.drawImage(
      sourceCanvas,
      0,
      offset,
      sourceCanvas.width,
      currentHeight,
      0,
      0,
      sourceCanvas.width,
      currentHeight,
    );

    pages.push(pageCanvas);

    if (
      currentHeight >=
      sourceCanvas.height
    ) {
      break;
    }

    offset +=
      currentHeight - overlap;

    if (offset <= 0) {
      offset = currentHeight;
    }
  }

  return pages;
}

function sanitizeHtmlInput(html) {
  if (
    typeof html !== "string"
  ) {
    return "";
  }

  return html.trim();
}

export async function getHtmlToPdfInfo(
  file,
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid HTML file.",
    );
  }

  if (!isSupportedHtmlFile(file)) {
    throw new Error(
      "Only .html and .htm files are supported.",
    );
  }

  const html =
    await file.text();

  const sanitizedHtml =
    sanitizeHtmlInput(html);

  if (!sanitizedHtml) {
    throw new Error(
      "The HTML file is empty.",
    );
  }

  const parser =
    new DOMParser();

  const documentResult =
    parser.parseFromString(
      sanitizedHtml,
      "text/html",
    );

  const title =
    documentResult.title?.trim() ||
    file.name.replace(
      /\.(html|htm)$/i,
      "",
    );

  const textContent =
    documentResult.body
      ?.textContent
      ?.replace(/\s+/g, " ")
      ?.trim() || "";

  const images =
    documentResult.querySelectorAll(
      "img",
    ).length;

  const links =
    documentResult.querySelectorAll(
      "a",
    ).length;

  const headings =
    documentResult.querySelectorAll(
      "h1, h2, h3, h4, h5, h6",
    ).length;

  return {
    name: file.name,
    size: file.size,
    sizeLabel: formatFileSize(
      file.size,
    ),
    extension:
      getFileExtension(file.name),
    title,
    characterCount:
      textContent.length,
    images,
    links,
    headings,
  };
}

export async function htmlToPdf(
  file,
  options = {},
  onProgress,
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid HTML file.",
    );
  }

  if (!isSupportedHtmlFile(file)) {
    throw new Error(
      "Only .html and .htm files are supported.",
    );
  }

  const {
    pageSize = "A4",
    orientation = "portrait",
    margin = 10,
    scale = 2,
    imageFormat = "jpeg",
    imageQuality = 0.95,
    backgroundColor = "#ffffff",
  } = options;

  const html =
    sanitizeHtmlInput(
      await file.text(),
    );

  if (!html) {
    throw new Error(
      "The HTML file is empty.",
    );
  }

  const safePageSize =
    normalizePageSize(pageSize);

  const safeOrientation =
    normalizeOrientation(
      orientation,
    );

  const safeMargin =
    Math.min(
      25,
      Math.max(
        0,
        Number(margin) || 10,
      ),
    );

  const safeScale =
    Math.min(
      3,
      Math.max(
        1,
        Number(scale) || 2,
      ),
    );

  const safeQuality =
    Math.min(
      1,
      Math.max(
        0.5,
        Number(imageQuality) || 0.95,
      ),
    );

  const safeImageFormat =
    imageFormat === "png"
      ? "png"
      : "jpeg";

  onProgress?.({
    stage: "loading",
    progress: 5,
    message:
      "Reading HTML document...",
  });

  const container =
    createRenderContainer(
      html,
    );

  try {
    container.style.background =
      backgroundColor;

    prepareCloneForPdf(
      container,
    );

    await waitForRenderResources(
      container,
    );

    onProgress?.({
      stage: "rendering",
      progress: 20,
      message:
        "Rendering HTML content...",
    });

    const renderCanvas =
      await html2canvas(
        container,
        {
          backgroundColor,
          scale: safeScale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 15000,
          removeContainer: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth:
            Math.max(
              document.documentElement
                ?.clientWidth || 1200,
              1200,
            ),
          onclone: (
            clonedDocument,
          ) => {
            const clonedContainer =
              clonedDocument.querySelector(
                '[data-kaizen-html-render="true"]',
              );

            if (clonedContainer) {
              clonedContainer.style.background =
                backgroundColor;
            }
          },
        },
      );

    onProgress?.({
      stage: "rendering",
      progress: 45,
      message:
        "Preparing PDF pages...",
    });

    if (
      !renderCanvas.width ||
      !renderCanvas.height
    ) {
      throw new Error(
        "The HTML document could not be rendered.",
      );
    }

    const dimensions =
      getPageDimensions(
        safePageSize,
        safeOrientation,
      );

    const pageWidth =
      dimensions.width;

    const pageHeight =
      dimensions.height;

    const contentWidth =
      pageWidth - safeMargin * 2;

    const pixelsPerMm =
      renderCanvas.width /
      Math.max(
        contentWidth,
        1,
      );

    const pagePixelHeight =
      Math.max(
        1,
        Math.floor(
          contentWidth > 0
            ? renderCanvas.width /
                contentWidth *
                (pageHeight -
                  safeMargin * 2)
            : renderCanvas.height,
        ),
      );

    const safePagePixelHeight =
      Math.min(
        renderCanvas.height,
        pagePixelHeight,
      );

    const pageCanvases =
      splitCanvasIntoPages(
        renderCanvas,
        safePagePixelHeight,
        Math.floor(
          pixelsPerMm * 2,
        ),
      );

    if (pageCanvases.length === 0) {
      throw new Error(
        "The HTML document produced no PDF pages.",
      );
    }

    const pdf =
      new jsPDF({
        orientation:
          safeOrientation,
        unit: "mm",
        format:
          safePageSize.toLowerCase(),
        compress: true,
      });

    for (
      let index = 0;
      index <
      pageCanvases.length;
      index += 1
    ) {
      if (index > 0) {
        pdf.addPage(
          safePageSize.toLowerCase(),
          safeOrientation,
        );
      }

      addCanvasPage(
        pdf,
        pageCanvases[index],
        pageWidth,
        pageHeight,
        safeMargin,
        safeImageFormat ===
          "png"
          ? "image/png"
          : "image/jpeg",
        safeQuality,
      );

      const progress =
        45 +
        ((index + 1) /
          pageCanvases.length) *
          45;

      onProgress?.({
        stage: "processing",
        progress: Math.round(
          progress,
        ),
        message:
          `Building PDF page ${index + 1} of ${pageCanvases.length}...`,
      });

      await new Promise(
        (resolve) => {
          setTimeout(
            resolve,
            0,
          );
        },
      );
    }

    onProgress?.({
      stage: "finalizing",
      progress: 96,
      message:
        "Finalizing HTML PDF...",
    });

    const baseName =
      file.name.replace(
        /\.(html|htm)$/i,
        "",
      );

    const outputFileName =
      `${baseName}.pdf`;

    const blob =
      pdf.output("blob");

    onProgress?.({
      stage: "complete",
      progress: 100,
      message:
        "HTML converted successfully.",
    });

    return {
      blob,
      fileName:
        outputFileName,
      pageCount:
        pageCanvases.length,
      size: blob.size,
    };
  } catch (error) {
    console.error(
      "HTML to PDF conversion error:",
      error,
    );

    throw new Error(
      error?.message ||
        "The HTML document could not be converted to PDF.",
    );
  } finally {
    if (
      container &&
      container.parentNode
    ) {
      container.parentNode.removeChild(
        container,
      );
    }
  }
}

export default {
  getHtmlToPdfInfo,
  htmlToPdf,
};