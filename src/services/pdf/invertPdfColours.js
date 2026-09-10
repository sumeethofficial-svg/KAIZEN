import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Validate a PDF file.
 */
function validatePdfFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }
}

/**
 * Load a PDF.js document from a File.
 */
async function loadPdfJsDocument(file) {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  return loadingTask.promise;
}

/**
 * Safely clean up a PDF.js document.
 *
 * Different pdfjs-dist versions expose different cleanup APIs.
 * We support the available methods without assuming .destroy()
 * exists directly on the returned document object.
 */
async function cleanupPdfDocument(pdf) {
  if (!pdf) {
    return;
  }

  try {
    if (typeof pdf.cleanup === "function") {
      pdf.cleanup();
    }
  } catch {
    // Ignore cleanup errors.
  }

  try {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  } catch {
    // Ignore cleanup errors.
  }
}

/**
 * Get basic PDF information.
 */
export async function getInvertPdfColoursInfo(file) {
  validatePdfFile(file);

  const pdf = await loadPdfJsDocument(file);

  try {
    return {
      fileName: file.name,
      pageCount: pdf.numPages,
      size: file.size,
    };
  } finally {
    await cleanupPdfDocument(pdf);
  }
}

/**
 * Invert the visible RGB colours of a canvas.
 *
 * Alpha is preserved.
 */
function invertCanvas(canvas) {
  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error(
      "Unable to access the PDF rendering canvas."
    );
  }

  const imageData = context.getImageData(
    0,
    0,
    canvas.width,
    canvas.height
  );

  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = 255 - pixels[index];
    pixels[index + 1] = 255 - pixels[index + 1];
    pixels[index + 2] = 255 - pixels[index + 2];
  }

  context.putImageData(imageData, 0, 0);
}

/**
 * Render one PDF page to an inverted canvas.
 */
async function renderInvertedPage(
  pdf,
  pageNumber,
  renderScale = 1.5
) {
  const page = await pdf.getPage(pageNumber);

  const viewport = page.getViewport({
    scale: renderScale,
  });

  const canvas = document.createElement("canvas");

  canvas.width = Math.max(
    1,
    Math.ceil(viewport.width)
  );

  canvas.height = Math.max(
    1,
    Math.ceil(viewport.height)
  );

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    throw new Error(
      "Unable to create the PDF rendering canvas."
    );
  }

  context.fillStyle = "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  invertCanvas(canvas);

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Convert a canvas into PNG bytes.
 */
async function canvasToPngBytes(canvas) {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (value) {
          resolve(value);
        } else {
          reject(
            new Error(
              "Unable to create the inverted page image."
            )
          );
        }
      },
      "image/png"
    );
  });

  const buffer = await blob.arrayBuffer();

  return new Uint8Array(buffer);
}

/**
 * Invert colours of every page in a PDF.
 *
 * The output is rebuilt from rasterized page images.
 * Therefore the resulting PDF does not retain the original
 * selectable text layer, links, forms, or annotations.
 */
export async function invertPdfColours(
  file,
  options = {},
  onProgress
) {
  validatePdfFile(file);

  const renderScale =
    typeof options.renderScale === "number"
      ? Math.max(
          0.75,
          Math.min(3, options.renderScale)
        )
      : 1.5;

  const sourcePdf = await loadPdfJsDocument(file);

  try {
    const totalPages = sourcePdf.numPages;

    if (totalPages === 0) {
      throw new Error("The PDF contains no pages.");
    }

    const outputPdf = await PDFDocument.create();

    onProgress?.({
      current: 0,
      total: totalPages,
      percent: 0,
    });

    for (
      let pageNumber = 1;
      pageNumber <= totalPages;
      pageNumber += 1
    ) {
      const renderedPage =
        await renderInvertedPage(
          sourcePdf,
          pageNumber,
          renderScale
        );

      const pngBytes =
        await canvasToPngBytes(
          renderedPage.canvas
        );

      const image = await outputPdf.embedPng(
        pngBytes
      );

      const outputPage =
        outputPdf.addPage([
          renderedPage.width / renderScale,
          renderedPage.height / renderScale,
        ]);

      outputPage.drawImage(image, {
        x: 0,
        y: 0,
        width:
          renderedPage.width / renderScale,
        height:
          renderedPage.height / renderScale,
      });

      /*
       * Release the canvas backing store once the PNG
       * has been embedded into the output PDF.
       */
      renderedPage.canvas.width = 1;
      renderedPage.canvas.height = 1;

      const percent = Math.round(
        (pageNumber / totalPages) * 100
      );

      onProgress?.({
        current: pageNumber,
        total: totalPages,
        percent,
      });
    }

    const outputBytes = await outputPdf.save();

    if (!outputBytes || outputBytes.length === 0) {
      throw new Error(
        "Failed to generate the inverted PDF."
      );
    }

    return new Blob([outputBytes], {
      type: "application/pdf",
    });
  } finally {
    await cleanupPdfDocument(sourcePdf);
  }
}