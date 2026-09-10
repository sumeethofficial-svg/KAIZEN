import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const DEFAULT_SCALE = 2;
const DEFAULT_JPEG_QUALITY = 0.92;

/**
 * Load a PDF and return its page count.
 */
export async function getPdfPageCount(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileBuffer),
  });

  const pdf = await loadingTask.promise;

  try {
    return pdf.numPages;
  } finally {
    await pdf.destroy();
  }
}

/**
 * Normalize and validate rendering options.
 */
function normalizeOptions(options = {}) {
  const scale = Number(options.scale ?? DEFAULT_SCALE);
  const quality = Number(
    options.quality ?? DEFAULT_JPEG_QUALITY
  );

  if (!Number.isFinite(scale) || scale <= 0) {
    throw new Error(
      "Image scale must be greater than zero."
    );
  }

  if (!Number.isFinite(quality) || quality <= 0 || quality > 1) {
    throw new Error(
      "JPEG quality must be between 0 and 1."
    );
  }

  return {
    scale,
    quality,
  };
}

/**
 * Validate the requested page selection.
 *
 * null = all pages
 */
function normalizePageSelection(
  selectedPages,
  totalPages
) {
  if (selectedPages === null || selectedPages === undefined) {
    return null;
  }

  if (!Array.isArray(selectedPages)) {
    throw new Error("Invalid page selection.");
  }

  if (selectedPages.length === 0) {
    throw new Error(
      "Select at least one page to convert."
    );
  }

  const normalizedPages = selectedPages.map(
    (pageNumber) => {
      const page = Number(pageNumber);

      if (!Number.isInteger(page)) {
        throw new Error(
          "Page selection must contain whole-number page values."
        );
      }

      if (page < 1 || page > totalPages) {
        throw new Error(
          `Page ${page} does not exist in this PDF.`
        );
      }

      return page;
    }
  );

  return [...new Set(normalizedPages)].sort(
    (a, b) => a - b
  );
}

/**
 * Convert one PDF page into a JPEG Blob.
 */
async function renderPageToJpeg(
  page,
  scale,
  quality
) {
  const viewport = page.getViewport({
    scale,
  });

  const canvas = document.createElement("canvas");

  const context = canvas.getContext("2d", {
    alpha: false,
  });

  if (!context) {
    throw new Error(
      "Your browser could not create a canvas for image rendering."
    );
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );
  context.restore();

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  const blob = await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (!result) {
            reject(
              new Error(
                "The browser could not create the JPG image."
              )
            );
            return;
          }

          resolve(result);
        },
        "image/jpeg",
        quality
      );
    }
  );

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Convert a PDF into JPG images.
 *
 * Returns one result object per converted page.
 */
export async function convertPdfToJpg(
  file,
  options = {},
  selectedPages = null,
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  const {
    scale,
    quality,
  } = normalizeOptions(options);

  const fileBuffer =
    await file.arrayBuffer();

  const loadingTask =
    pdfjsLib.getDocument({
      data: new Uint8Array(fileBuffer),
    });

  const pdf =
    await loadingTask.promise;

  try {
    const totalPages =
      pdf.numPages;

    const pageSelection =
      normalizePageSelection(
        selectedPages,
        totalPages
      );

    const pagesToConvert =
      pageSelection ??
      Array.from(
        { length: totalPages },
        (_, index) => index + 1
      );

    const results = [];

    for (
      let index = 0;
      index < pagesToConvert.length;
      index += 1
    ) {
      const pageNumber =
        pagesToConvert[index];

      const page =
        await pdf.getPage(
          pageNumber
        );

      const rendered =
        await renderPageToJpeg(
          page,
          scale,
          quality
        );

      results.push({
        blob: rendered.blob,
        pageNumber,
        width: rendered.width,
        height: rendered.height,
        fileName: `${file.name.replace(
          /\.pdf$/i,
          ""
        )}-page-${String(
          pageNumber
        ).padStart(3, "0")}.jpg`,
      });

      if (typeof onProgress === "function") {
        onProgress({
          completed: index + 1,
          total: pagesToConvert.length,
          percentage: Math.round(
            ((index + 1) /
              pagesToConvert.length) *
              100
          ),
        });
      }

      page.cleanup();
    }

    return {
      results,
      totalPages,
      convertedPages: results.length,
      scale,
      quality,
    };
  } finally {
    await pdf.destroy();
  }
}