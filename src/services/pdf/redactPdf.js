import {
  PDFDocument,
  rgb,
} from "pdf-lib";

import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Load a PDF and return page information.
 */
export async function getRedactPdfInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer =
    await file.arrayBuffer();

  const loadingTask =
    getDocument({
      data: new Uint8Array(
        fileBuffer
      ),
    });

  const pdf =
    await loadingTask.promise;

  const pages = [];

  for (
    let pageNumber = 1;
    pageNumber <= pdf.numPages;
    pageNumber += 1
  ) {
    const page =
      await pdf.getPage(
        pageNumber
      );

    const viewport =
      page.getViewport({
        scale: 1,
      });

    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      rotation:
        viewport.rotation || 0,
    });
  }

  await pdf.destroy();

  return {
    pageCount: pdf.numPages,
    pages,
  };
}

/**
 * Validate a normalized redaction rectangle.
 *
 * Coordinates:
 * - x/y = 0..1
 * - origin = top-left
 */
function validateRect(rect) {
  if (
    !rect ||
    typeof rect !== "object"
  ) {
    throw new Error(
      "Invalid redaction area."
    );
  }

  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new Error(
      "Redaction area contains invalid coordinates."
    );
  }

  if (
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1.000001 ||
    y + height > 1.000001
  ) {
    throw new Error(
      "Redaction area must remain inside the PDF page."
    );
  }

  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Normalize a fill color.
 *
 * Supports:
 * [0, 0, 0]
 * [255, 0, 0]
 */
function normalizeColor(
  color,
  fallback = [0, 0, 0]
) {
  if (
    !Array.isArray(color) ||
    color.length !== 3
  ) {
    return fallback;
  }

  const values =
    color.map(Number);

  if (
    values.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    return fallback;
  }

  const divisor = values.some(
    (value) => value > 1
  )
    ? 255
    : 1;

  return values.map(
    (value) =>
      Math.max(
        0,
        Math.min(
          1,
          value / divisor
        )
      )
  );
}

/**
 * Convert normalized page coordinates
 * into pixel coordinates.
 */
function normalizedRectToPixels(
  rect,
  width,
  height
) {
  const normalized =
    validateRect(rect);

  return {
    x:
      normalized.x * width,
    y:
      normalized.y * height,
    width:
      normalized.width * width,
    height:
      normalized.height * height,
  };
}

/**
 * Group redactions by page.
 */
function groupRedactionsByPage(
  redactions,
  pageCount
) {
  const grouped =
    new Map();

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    grouped.set(
      pageNumber,
      []
    );
  }

  redactions.forEach(
    (redaction) => {
      const pageNumber =
        Number(
          redaction?.pageNumber
        );

      if (
        !Number.isInteger(
          pageNumber
        ) ||
        pageNumber < 1 ||
        pageNumber > pageCount
      ) {
        throw new Error(
          `Redaction references invalid page ${redaction?.pageNumber}.`
        );
      }

      grouped
        .get(pageNumber)
        .push(redaction);
    }
  );

  return grouped;
}

/**
 * Draw a redaction rectangle directly
 * onto a canvas.
 */
function applyRedactionToCanvas(
  context,
  rect,
  canvasWidth,
  canvasHeight,
  color
) {
  const pixelRect =
    normalizedRectToPixels(
      rect,
      canvasWidth,
      canvasHeight
    );

  context.save();

  context.fillStyle =
    `rgb(${Math.round(
      color[0] * 255
    )}, ${Math.round(
      color[1] * 255
    )}, ${Math.round(
      color[2] * 255
    )})`;

  context.fillRect(
    pixelRect.x,
    pixelRect.y,
    pixelRect.width,
    pixelRect.height
  );

  context.restore();
}

/**
 * Render one PDF page onto a canvas.
 *
 * Higher scale improves output quality.
 */
async function renderPageToCanvas(
  pdfPage,
  scale
) {
  const viewport =
    pdfPage.getViewport({
      scale,
    });

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    Math.ceil(
      viewport.width
    );

  canvas.height =
    Math.ceil(
      viewport.height
    );

  const context =
    canvas.getContext(
      "2d",
      {
        alpha: false,
      }
    );

  if (!context) {
    throw new Error(
      "Unable to create the PDF rendering canvas."
    );
  }

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await pdfPage.render({
    canvasContext:
      context,
    viewport,
    background:
      "#ffffff",
  }).promise;

  return {
    canvas,
    width:
      canvas.width,
    height:
      canvas.height,
    viewport,
  };
}

/**
 * Convert a rendered canvas to PNG bytes.
 *
 * PNG is used intentionally to avoid compression
 * artifacts around redacted text.
 */
async function canvasToPngBytes(
  canvas
) {
  const blob =
    await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(
                new Error(
                  "Unable to encode rendered PDF page."
                )
              );

              return;
            }

            resolve(result);
          },
          "image/png"
        );
      }
    );

  return blob.arrayBuffer();
}

/**
 * Create a new PDF page with the rendered
 * rasterized page.
 */
function addRenderedPageToPdf(
  pdf,
  image,
  width,
  height
) {
  const page =
    pdf.addPage([
      width,
      height,
    ]);

  page.drawImage(image, {
    x: 0,
    y: 0,
    width,
    height,
  });

  return page;
}

/**
 * Create a redaction object.
 */
export function createRedaction(
  pageNumber,
  rect,
  options = {}
) {
  return {
    type: "redaction",
    pageNumber,
    ...rect,
    color:
      options.color ?? [
        0,
        0,
        0,
      ],
  };
}

/**
 * Permanently redact PDF content.
 *
 * IMPORTANT:
 *
 * This process rasterizes each page and builds
 * a new PDF from the rendered pages.
 *
 * That means the original PDF text layer,
 * links, form fields, annotations and other
 * interactive structures are not carried into
 * the output.
 *
 * Redacted pixels are permanently baked into
 * the generated page image.
 */
export async function redactPdf(
  file,
  redactions = [],
  options = {},
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  if (
    !Array.isArray(redactions) ||
    redactions.length === 0
  ) {
    throw new Error(
      "Please add at least one redaction area."
    );
  }

  if (
    typeof document ===
      "undefined" ||
    typeof document.createElement !==
      "function"
  ) {
    throw new Error(
      "PDF redaction requires a browser rendering environment."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(3);
  }

  const loadingTask =
    getDocument({
      data: new Uint8Array(
        fileBuffer
      ),
    });

  const sourcePdf =
    await loadingTask.promise;

  const pageCount =
    sourcePdf.numPages;

  if (pageCount < 1) {
    await sourcePdf.destroy();

    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(8);
  }

  const groupedRedactions =
    groupRedactionsByPage(
      redactions,
      pageCount
    );

  const scaleValue =
    Number(
      options.scale ?? 2
    );

  const scale =
    Number.isFinite(
      scaleValue
    ) &&
    scaleValue > 0
      ? Math.min(
          4,
          Math.max(
            1,
            scaleValue
          )
        )
      : 2;

  const redactionColor =
    normalizeColor(
      options.redactionColor,
      [0, 0, 0]
    );

  const outputPdf =
    await PDFDocument.create();

  /*
   * Copy document metadata where possible.
   * The page content itself is intentionally
   * rebuilt from rendered pixels.
   */
  try {
    const title =
      sourcePdf
        .getMetadata?.()
        ?.info?.Title;

    if (title) {
      outputPdf.setTitle(
        String(title)
      );
    }
  } catch {
    // Metadata is non-critical.
  }

  let processedPages = 0;
  let processedRedactions = 0;

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber += 1
  ) {
    const sourcePage =
      await sourcePdf.getPage(
        pageNumber
      );

    const rendered =
      await renderPageToCanvas(
        sourcePage,
        scale
      );

    const pageRedactions =
      groupedRedactions.get(
        pageNumber
      ) || [];

    for (
      const redaction of
        pageRedactions
    ) {
      const color =
        normalizeColor(
          redaction.color,
          redactionColor
        );

      applyRedactionToCanvas(
        rendered.canvas,
        redaction,
        rendered.width,
        rendered.height,
        color
      );

      processedRedactions +=
        1;
    }

    const imageBytes =
      await canvasToPngBytes(
        rendered.canvas
      );

    const embeddedImage =
      await outputPdf.embedPng(
        imageBytes
      );

    addRenderedPageToPdf(
      outputPdf,
      embeddedImage,
      rendered.width /
        scale,
      rendered.height /
        scale
    );

    /*
     * Release the canvas backing store as early
     * as possible to reduce memory pressure on
     * large documents.
     */
    rendered.canvas.width = 1;
    rendered.canvas.height = 1;

    processedPages += 1;

    if (
      typeof onProgress ===
      "function"
    ) {
      const percentage =
        10 +
        Math.round(
          (processedPages /
            pageCount) *
            78
        );

      onProgress(
        Math.min(
          88,
          percentage
        )
      );
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(91);
  }

  const pdfBytes =
    await outputPdf.save({
      useObjectStreams: true,
    });

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(96);
  }

  await sourcePdf.destroy();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(100);
  }

  return {
    blob: new Blob(
      [pdfBytes],
      {
        type: "application/pdf",
      }
    ),
    pageCount,
    redactionCount:
      processedRedactions,
    rasterized: true,
    scale,
  };
}