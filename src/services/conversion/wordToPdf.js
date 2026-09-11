import { renderAsync } from "docx-preview";
import html2pdf from "html2pdf.js";

/**
 * Validate the selected Word document.
 */
function validateWordFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid Word document.");
  }

  const name = file.name.toLowerCase();

  const isDocx =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");

  if (!isDocx) {
    throw new Error(
      "Please select a .docx Word document."
    );
  }
}

/**
 * Get basic information about the Word document.
 */
export async function getWordToPdfInfo(file) {
  validateWordFile(file);

  return {
    fileName: file.name,
    size: file.size,
    type: file.type,
  };
}

/**
 * Create a temporary rendering surface.
 *
 * The element stays outside the visible viewport so the
 * user does not see the intermediate DOCX → HTML rendering.
 */
function createRenderSurface() {
  const wrapper =
    document.createElement("div");

  wrapper.setAttribute(
    "data-kaizen-word-render",
    "true"
  );

  wrapper.style.position = "fixed";
  wrapper.style.left = "-100000px";
  wrapper.style.top = "0";
  wrapper.style.width = "794px";
  wrapper.style.background = "#ffffff";
  wrapper.style.color = "#000000";
  wrapper.style.zIndex = "-1";
  wrapper.style.pointerEvents = "none";
  wrapper.style.overflow = "visible";

  document.body.appendChild(wrapper);

  return wrapper;
}

/**
 * Give the rendered DOCX a predictable printable layout.
 */
function prepareRenderSurface(wrapper) {
  const style =
    document.createElement("style");

  style.textContent = `
    [data-kaizen-word-render] {
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      color: #000;
      background: #fff;
    }

    [data-kaizen-word-render] .docx-wrapper {
      width: 100% !important;
      background: #fff !important;
    }

    [data-kaizen-word-render] .docx {
      margin: 0 auto !important;
      box-shadow: none !important;
      background: #fff !important;
    }

    [data-kaizen-word-render] table {
      page-break-inside: avoid;
    }

    [data-kaizen-word-render] img {
      max-width: 100%;
    }
  `;

  wrapper.appendChild(style);
}

/**
 * Wait for fonts and images inside the rendered document.
 */
async function waitForRenderedAssets(wrapper) {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Continue even if the browser font promise fails.
    }
  }

  const images =
    Array.from(
      wrapper.querySelectorAll("img")
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
            { once: true }
          );

          image.addEventListener(
            "error",
            resolve,
            { once: true }
          );
        })
    )
  );
}

/**
 * Build a printable PDF from the rendered DOCX.
 */
async function buildPdf(
  wrapper,
  outputName,
  onProgress
) {
  const worker =
    html2pdf()
      .set({
        margin: 0,

        filename: outputName,

        image: {
          type: "jpeg",
          quality: 0.98,
        },

        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
        },

        jsPDF: {
          unit: "pt",
          format: "a4",
          orientation: "portrait",
          compress: true,
        },

        pagebreak: {
          mode: [
            "css",
            "legacy",
          ],
        },
      })
      .from(wrapper)
      .toPdf();

  onProgress?.({
    current: 1,
    total: 3,
    percent: 60,
  });

  const pdf =
    await worker.get("pdf");

  onProgress?.({
    current: 2,
    total: 3,
    percent: 85,
  });

  const blob =
    pdf.output("blob");

  onProgress?.({
    current: 3,
    total: 3,
    percent: 100,
  });

  return blob;
}

/**
 * Convert DOCX → PDF.
 *
 * Processing happens locally in the browser.
 */
export async function wordToPdf(
  file,
  onProgress
) {
  validateWordFile(file);

  onProgress?.({
    current: 0,
    total: 3,
    percent: 5,
  });

  const wrapper =
    createRenderSurface();

  try {
    prepareRenderSurface(
      wrapper
    );

    onProgress?.({
      current: 0,
      total: 3,
      percent: 15,
    });

    const arrayBuffer =
      await file.arrayBuffer();

    /*
     * docx-preview renders the Word document
     * into HTML while preserving much of its
     * original structure and formatting.
     */
    await renderAsync(
      arrayBuffer,
      wrapper,
      wrapper,
      {
        className: "docx",

        inWrapper: true,

        hideWrapperOnPrint: false,

        ignoreWidth: false,

        ignoreHeight: false,

        ignoreFonts: false,

        breakPages: true,

        ignoreLastRenderedPageBreak:
          false,

        renderHeaders: true,

        renderFooters: true,

        renderFootnotes: true,

        renderEndnotes: true,

        useBase64URL: true,

        debug: false,
      }
    );

    onProgress?.({
      current: 1,
      total: 3,
      percent: 40,
    });

    await waitForRenderedAssets(
      wrapper
    );

    /*
     * Let the browser complete layout/reflow
     * before html2pdf captures the document.
     */
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    const baseName =
      file.name.replace(
        /\.docx$/i,
        ""
      );

    const outputName =
      `${baseName}.pdf`;

    return await buildPdf(
      wrapper,
      outputName,
      onProgress
    );
  } catch (error) {
    throw new Error(
      error?.message ||
        "Unable to convert the Word document to PDF."
    );
  } finally {
    wrapper.remove();
  }
}