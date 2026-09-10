import { PDFDocument } from "pdf-lib";

/**
 * Get basic PDF information.
 */
export async function getPdfInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);

  return {
    pageCount: pdf.getPageCount(),
    pages: Array.from(
      { length: pdf.getPageCount() },
      (_, index) => {
        const page = pdf.getPage(index);

        return {
          pageNumber: index + 1,
          width: page.getWidth(),
          height: page.getHeight(),
          rotation: page.getRotation().angle,
        };
      }
    ),
  };
}

/**
 * Validate a visual crop rectangle.
 *
 * Coordinates are normalized values between 0 and 1.
 *
 * x      = distance from left edge
 * y      = distance from top edge
 * width  = crop width
 * height = crop height
 */
export function validateCropRect(
  cropRect
) {
  if (!cropRect || typeof cropRect !== "object") {
    throw new Error(
      "A valid crop area is required."
    );
  }

  const x = Number(cropRect.x);
  const y = Number(cropRect.y);
  const width = Number(cropRect.width);
  const height = Number(cropRect.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new Error(
      "Crop coordinates must be valid numbers."
    );
  }

  if (
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      "Crop coordinates must be greater than zero."
    );
  }

  if (x >= 1 || y >= 1) {
    throw new Error(
      "Crop position must remain inside the page."
    );
  }

  if (x + width > 1.000001) {
    throw new Error(
      "Crop area extends beyond the right edge of the page."
    );
  }

  if (y + height > 1.000001) {
    throw new Error(
      "Crop area extends beyond the bottom edge of the page."
    );
  }

  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
    width: Math.max(
      0,
      Math.min(1 - x, width)
    ),
    height: Math.max(
      0,
      Math.min(1 - y, height)
    ),
  };
}

/**
 * Convert a normalized visual crop rectangle
 * into PDF coordinates.
 *
 * Visual coordinates:
 *   origin = top-left
 *
 * PDF coordinates:
 *   origin = bottom-left
 */
export function getPdfCropBox(
  pageWidth,
  pageHeight,
  cropRect
) {
  if (
    !Number.isFinite(pageWidth) ||
    !Number.isFinite(pageHeight) ||
    pageWidth <= 0 ||
    pageHeight <= 0
  ) {
    throw new Error(
      "The PDF contains an invalid page size."
    );
  }

  const crop =
    validateCropRect(
      cropRect
    );

  const x =
    crop.x * pageWidth;

  const yFromTop =
    crop.y * pageHeight;

  const cropWidth =
    crop.width * pageWidth;

  const cropHeight =
    crop.height * pageHeight;

  const bottom =
    pageHeight -
    yFromTop -
    cropHeight;

  return {
    x,
    y: bottom,
    width: cropWidth,
    height: cropHeight,
  };
}

/**
 * Apply a visual crop rectangle to a page.
 */
function applyVisualCrop(
  page,
  cropRect
) {
  const pageWidth =
    page.getWidth();

  const pageHeight =
    page.getHeight();

  const cropBox =
    getPdfCropBox(
      pageWidth,
      pageHeight,
      cropRect
    );

  const newWidth =
    cropBox.width;

  const newHeight =
    cropBox.height;

  /*
   * Move the content so that the selected
   * crop area's lower-left corner becomes
   * the new page origin.
   */
  page.translateContent(
    -cropBox.x,
    -cropBox.y
  );

  page.setMediaBox(
    0,
    0,
    newWidth,
    newHeight
  );

  page.setCropBox(
    0,
    0,
    newWidth,
    newHeight
  );

  return {
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Apply resize to a page.
 */
function applyResize(
  page,
  resizeOptions
) {
  const currentWidth =
    page.getWidth();

  const currentHeight =
    page.getHeight();

  const width =
    resizeOptions?.width == null
      ? null
      : Number(
          resizeOptions.width
        );

  const height =
    resizeOptions?.height == null
      ? null
      : Number(
          resizeOptions.height
        );

  const preserveAspectRatio =
    resizeOptions
      ?.preserveAspectRatio !== false;

  if (
    width !== null &&
    (!Number.isFinite(width) ||
      width <= 0)
  ) {
    throw new Error(
      "Resize width must be greater than zero."
    );
  }

  if (
    height !== null &&
    (!Number.isFinite(height) ||
      height <= 0)
  ) {
    throw new Error(
      "Resize height must be greater than zero."
    );
  }

  if (
    width === null &&
    height === null
  ) {
    return {
      width: currentWidth,
      height: currentHeight,
    };
  }

  let targetWidth =
    width ?? currentWidth;

  let targetHeight =
    height ?? currentHeight;

  if (preserveAspectRatio) {
    if (
      width !== null &&
      height === null
    ) {
      targetHeight =
        currentHeight *
        (width / currentWidth);
    } else if (
      width === null &&
      height !== null
    ) {
      targetWidth =
        currentWidth *
        (height / currentHeight);
    } else {
      const widthScale =
        width / currentWidth;

      const heightScale =
        height / currentHeight;

      const scale = Math.min(
        widthScale,
        heightScale
      );

      targetWidth =
        currentWidth * scale;

      targetHeight =
        currentHeight * scale;
    }
  }

  const scaleX =
    targetWidth / currentWidth;

  const scaleY =
    targetHeight / currentHeight;

  page.scaleContent(
    scaleX,
    scaleY
  );

  page.setMediaBox(
    0,
    0,
    targetWidth,
    targetHeight
  );

  page.setCropBox(
    0,
    0,
    targetWidth,
    targetHeight
  );

  return {
    width: targetWidth,
    height: targetHeight,
  };
}

/**
 * Validate selected page numbers.
 *
 * null = all pages.
 */
function normalizePageSelection(
  selectedPages,
  totalPages
) {
  if (
    selectedPages === null ||
    selectedPages === undefined
  ) {
    return null;
  }

  if (!Array.isArray(selectedPages)) {
    throw new Error(
      "Invalid page selection."
    );
  }

  if (selectedPages.length === 0) {
    throw new Error(
      "Select at least one page."
    );
  }

  const normalized =
    selectedPages.map(
      (pageNumber) => {
        const page =
          Number(pageNumber);

        if (
          !Number.isInteger(page)
        ) {
          throw new Error(
            "Page selection must contain whole-number page values."
          );
        }

        if (
          page < 1 ||
          page > totalPages
        ) {
          throw new Error(
            `Page ${page} does not exist in this PDF.`
          );
        }

        return page;
      }
    );

  return [
    ...new Set(normalized),
  ].sort(
    (a, b) => a - b
  );
}

/**
 * Crop and/or resize a PDF.
 *
 * Expected options:
 *
 * {
 *   cropRect: {
 *     x: 0.1,
 *     y: 0.1,
 *     width: 0.8,
 *     height: 0.8
 *   },
 *
 *   resize: {
 *     width: 595,
 *     height: 842,
 *     preserveAspectRatio: true
 *   }
 * }
 *
 * cropRect uses normalized visual coordinates.
 * Origin is the top-left corner.
 */
export async function cropResizePdf(
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

  const fileBuffer =
    await file.arrayBuffer();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(5);
  }

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  const totalPages =
    pdf.getPageCount();

  if (totalPages < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(12);
  }

  const pageSelection =
    normalizePageSelection(
      selectedPages,
      totalPages
    );

  const selectedSet =
    pageSelection === null
      ? null
      : new Set(pageSelection);

  const hasCrop =
    options.cropRect !==
      null &&
    options.cropRect !==
      undefined;

  const hasResize =
    options.resize !==
      null &&
    options.resize !==
      undefined;

  if (!hasCrop && !hasResize) {
    throw new Error(
      "Please define a crop area or resize dimensions."
    );
  }

  if (
    hasCrop
  ) {
    validateCropRect(
      options.cropRect
    );
  }

  const processedPages = [];

  const pagesToProcess =
    pageSelection ??
    Array.from(
      { length: totalPages },
      (_, index) => index + 1
    );

  for (
    let index = 0;
    index <
      pagesToProcess.length;
    index += 1
  ) {
    const pageNumber =
      pagesToProcess[index];

    if (
      selectedSet !== null &&
      !selectedSet.has(
        pageNumber
      )
    ) {
      continue;
    }

    const page =
      pdf.getPage(
        pageNumber - 1
      );

    let finalWidth =
      page.getWidth();

    let finalHeight =
      page.getHeight();

    if (hasCrop) {
      const cropped =
        applyVisualCrop(
          page,
          options.cropRect
        );

      finalWidth =
        cropped.width;

      finalHeight =
        cropped.height;
    }

    if (hasResize) {
      const resized =
        applyResize(
          page,
          options.resize
        );

      finalWidth =
        resized.width;

      finalHeight =
        resized.height;
    }

    processedPages.push({
      pageNumber,
      width: finalWidth,
      height: finalHeight,
    });

    if (
      typeof onProgress ===
      "function"
    ) {
      const percentage =
        15 +
        Math.round(
          ((index + 1) /
            pagesToProcess.length) *
            75
        );

      onProgress(
        Math.min(
          90,
          percentage
        )
      );
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(94);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
    });

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
    totalPages,
    processedPages:
      processedPages.length,
    results: processedPages,
  };
}