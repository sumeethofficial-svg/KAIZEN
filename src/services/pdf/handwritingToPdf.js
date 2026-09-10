import { PDFDocument } from "pdf-lib";

/**
 * Supported image formats.
 */
const SUPPORTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

/**
 * Validate an image file.
 */
function validateImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid image file.");
  }

  const lowerName = file.name.toLowerCase();

  const validExtension =
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp");

  if (
    !SUPPORTED_IMAGE_TYPES.includes(file.type) &&
    !validExtension
  ) {
    throw new Error(
      "Please use PNG, JPG, JPEG, or WebP handwriting images."
    );
  }
}

/**
 * Get image dimensions from a browser File.
 */
async function getImageDimensions(file) {
  validateImageFile(file);

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(
          new Error(
            `Unable to read "${file.name}".`
          )
        );

      image.src = objectUrl;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Get basic information about the handwriting images.
 */
export async function getHandwritingToPdfInfo(
  files
) {
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error(
      "Please provide at least one handwriting image."
    );
  }

  const images = [];

  let totalSize = 0;

  for (const file of files) {
    const dimensions =
      await getImageDimensions(file);

    images.push({
      name: file.name,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      type: file.type,
    });

    totalSize += file.size;
  }

  return {
    fileCount: images.length,
    totalSize,
    images,
  };
}

/**
 * Normalize PDF page size.
 */
function getPageSize(
  pageSize,
  orientation,
  imageWidth,
  imageHeight
) {
  const sizes = {
    A4: {
      width: 595.28,
      height: 841.89,
    },

    A5: {
      width: 419.53,
      height: 595.28,
    },

    Letter: {
      width: 612,
      height: 792,
    },

    Legal: {
      width: 612,
      height: 1008,
    },

    original: {
      width: imageWidth,
      height: imageHeight,
    },
  };

  const selected =
    sizes[pageSize] ||
    sizes.A4;

  if (pageSize === "original") {
    return selected;
  }

  if (orientation === "landscape") {
    return {
      width: selected.height,
      height: selected.width,
    };
  }

  return selected;
}

/**
 * Create normalized conversion options.
 */
export function createHandwritingToPdfOptions(
  options = {}
) {
  return {
    pageSize:
      options.pageSize || "A4",

    orientation:
      options.orientation || "portrait",

    margin:
      typeof options.margin === "number"
        ? Math.max(
            0,
            Math.min(
              150,
              options.margin
            )
          )
        : 36,

    fit:
      options.fit || "contain",

    alignment:
      options.alignment || "center",

    verticalAlignment:
      options.verticalAlignment ||
      "center",

    background:
      options.background !== false,

    backgroundColor:
      options.backgroundColor ||
      "#ffffff",

    imageQuality:
      typeof options.imageQuality === "number"
        ? Math.max(
            0.4,
            Math.min(
              1,
              options.imageQuality
            )
          )
        : 0.92,

    rotation:
      typeof options.rotation === "number"
        ? Number(options.rotation)
        : 0,
  };
}

/**
 * Convert a browser image into a PNG or JPEG suitable
 * for embedding into pdf-lib.
 *
 * The canvas allows us to normalize orientation,
 * background and quality before PDF embedding.
 */
async function prepareImage(
  file,
  options
) {
  validateImageFile(file);

  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;

      image.onerror = () =>
        reject(
          new Error(
            `Unable to load "${file.name}".`
          )
        );

      image.src = objectUrl;
    });

    const sourceWidth =
      image.naturalWidth;

    const sourceHeight =
      image.naturalHeight;

    const rotated =
      Math.abs(
        options.rotation % 180
      ) === 90;

    const canvasWidth =
      rotated
        ? sourceHeight
        : sourceWidth;

    const canvasHeight =
      rotated
        ? sourceWidth
        : sourceHeight;

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      Math.max(
        1,
        canvasWidth
      );

    canvas.height =
      Math.max(
        1,
        canvasHeight
      );

    const context =
      canvas.getContext("2d");

    if (!context) {
      throw new Error(
        `Unable to process "${file.name}".`
      );
    }

    if (options.background) {
      context.fillStyle =
        options.backgroundColor;

      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      );
    }

    context.save();

    context.translate(
      canvas.width / 2,
      canvas.height / 2
    );

    context.rotate(
      (options.rotation *
        Math.PI) /
        180
    );

    context.drawImage(
      image,
      -sourceWidth / 2,
      -sourceHeight / 2,
      sourceWidth,
      sourceHeight
    );

    context.restore();

    const mimeType =
      file.type === "image/jpeg"
        ? "image/jpeg"
        : "image/png";

    const blob =
      await new Promise(
        (resolve, reject) => {
          canvas.toBlob(
            (value) => {
              if (value) {
                resolve(value);
              } else {
                reject(
                  new Error(
                    `Unable to prepare "${file.name}".`
                  )
                );
              }
            },
            mimeType,
            options.imageQuality
          );
        }
      );

    const bytes =
      new Uint8Array(
        await blob.arrayBuffer()
      );

    return {
      bytes,
      mimeType,
      width:
        canvas.width,
      height:
        canvas.height,
    };
  } finally {
    URL.revokeObjectURL(
      objectUrl
    );
  }
}

/**
 * Calculate the displayed image rectangle
 * inside a PDF page.
 */
function calculateImageRect({
  imageWidth,
  imageHeight,
  pageWidth,
  pageHeight,
  margin,
  fit,
  alignment,
  verticalAlignment,
}) {
  const availableWidth =
    Math.max(
      1,
      pageWidth -
        margin * 2
    );

  const availableHeight =
    Math.max(
      1,
      pageHeight -
        margin * 2
    );

  let drawWidth =
    imageWidth;

  let drawHeight =
    imageHeight;

  if (fit === "contain") {
    const scale =
      Math.min(
        availableWidth /
          imageWidth,
        availableHeight /
          imageHeight
      );

    drawWidth =
      imageWidth *
      scale;

    drawHeight =
      imageHeight *
      scale;
  } else if (fit === "cover") {
    const scale =
      Math.max(
        availableWidth /
          imageWidth,
        availableHeight /
          imageHeight
      );

    drawWidth =
      imageWidth *
      scale;

    drawHeight =
      imageHeight *
      scale;
  } else if (fit === "width") {
    const scale =
      availableWidth /
      imageWidth;

    drawWidth =
      imageWidth *
      scale;

    drawHeight =
      imageHeight *
      scale;
  } else if (fit === "height") {
    const scale =
      availableHeight /
      imageHeight;

    drawWidth =
      imageWidth *
      scale;

    drawHeight =
      imageHeight *
      scale;
  }

  let x =
    margin;

  let y =
    margin;

  if (alignment === "center") {
    x =
      margin +
      (availableWidth -
        drawWidth) /
        2;
  } else if (
    alignment === "right"
  ) {
    x =
      pageWidth -
      margin -
      drawWidth;
  }

  if (
    verticalAlignment ===
    "center"
  ) {
    y =
      margin +
      (availableHeight -
        drawHeight) /
        2;
  } else if (
    verticalAlignment ===
    "bottom"
  ) {
    y =
      pageHeight -
      margin -
      drawHeight;
  }

  return {
    x,
    y,
    width:
      drawWidth,
    height:
      drawHeight,
  };
}

/**
 * Build a PDF where each handwriting image
 * becomes one PDF page.
 */
export async function handwritingToPdf(
  files,
  options = {},
  onProgress
) {
  if (
    !Array.isArray(files) ||
    files.length === 0
  ) {
    throw new Error(
      "Please provide at least one handwriting image."
    );
  }

  for (const file of files) {
    validateImageFile(file);
  }

  const normalizedOptions =
    createHandwritingToPdfOptions(
      options
    );

  const pdfDoc =
    await PDFDocument.create();

  const total =
    files.length;

  onProgress?.({
    current: 0,
    total,
    percent: 0,
  });

  for (
    let index = 0;
    index < files.length;
    index += 1
  ) {
    const file =
      files[index];

    const prepared =
      await prepareImage(
        file,
        normalizedOptions
      );

    const pageSize =
      getPageSize(
        normalizedOptions.pageSize,
        normalizedOptions.orientation,
        prepared.width,
        prepared.height
      );

    const page =
      pdfDoc.addPage([
        pageSize.width,
        pageSize.height,
      ]);

    if (
      normalizedOptions.background
    ) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width:
          pageSize.width,
        height:
          pageSize.height,
        color:
          hexToRgb(
            normalizedOptions.backgroundColor
          ),
      });
    }

    const rect =
      calculateImageRect({
        imageWidth:
          prepared.width,
        imageHeight:
          prepared.height,
        pageWidth:
          pageSize.width,
        pageHeight:
          pageSize.height,
        margin:
          normalizedOptions.margin,
        fit:
          normalizedOptions.fit,
        alignment:
          normalizedOptions.alignment,
        verticalAlignment:
          normalizedOptions.verticalAlignment,
      });

    let image;

    if (
      prepared.mimeType ===
      "image/jpeg"
    ) {
      image =
        await pdfDoc.embedJpg(
          prepared.bytes
        );
    } else {
      image =
        await pdfDoc.embedPng(
          prepared.bytes
        );
    }

    page.drawImage(
      image,
      {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    );

    /*
     * Release browser-side canvas/image bytes
     * as soon as this page is embedded.
     */
    prepared.bytes =
      new Uint8Array(
        0
      );

    const current =
      index + 1;

    onProgress?.({
      current,
      total,
      percent: Math.round(
        (current / total) *
          100
      ),
    });
  }

  const outputBytes =
    await pdfDoc.save();

  if (
    !outputBytes ||
    outputBytes.length === 0
  ) {
    throw new Error(
      "Failed to generate the handwriting PDF."
    );
  }

  return new Blob(
    [outputBytes],
    {
      type: "application/pdf",
    }
  );
}

/**
 * Convert a hex colour to pdf-lib rgb().
 */
function hexToRgb(hex) {
  const value =
    String(hex || "#ffffff")
      .replace(
        "#",
        ""
      );

  const normalized =
    value.length === 3
      ? value
          .split("")
          .map(
            (character) =>
              character +
              character
          )
          .join("")
      : value;

  const numeric =
    Number.parseInt(
      normalized,
      16
    );

  if (
    Number.isNaN(numeric)
  ) {
    return {
      type: "RGB",
      red: 1,
      green: 1,
      blue: 1,
    };
  }

  return {
    type: "RGB",
    red:
      ((numeric >> 16) &
        255) /
      255,
    green:
      ((numeric >> 8) &
        255) /
      255,
    blue:
      (numeric & 255) /
      255,
  };
}