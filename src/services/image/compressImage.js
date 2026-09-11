// src/services/image/compressImage.js

/**
 * Detect image format.
 */
export function detectImageFormat(file) {
  if (!file) {
    return "unknown";
  }

  const mimeType = (
    file.type || ""
  ).toLowerCase();

  const extension =
    file.name
      ?.split(".")
      .pop()
      ?.toLowerCase() || "";

  const mimeFormats = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
  };

  if (mimeFormats[mimeType]) {
    return mimeFormats[mimeType];
  }

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension || "unknown";
}


/**
 * Load image.
 */
async function loadImage(file) {
  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image =
      new Image();

    image.src = objectUrl;

    await new Promise(
      (resolve, reject) => {
        image.onload = resolve;

        image.onerror = () => {
          reject(
            new Error(
              "This image could not be loaded."
            )
          );
        };
      }
    );

    return image;
  } finally {
    URL.revokeObjectURL(
      objectUrl
    );
  }
}


/**
 * Convert canvas to Blob.
 */
function canvasToBlob(
  canvas,
  mimeType,
  quality
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Could not create compressed image."
              )
            );

            return;
          }

          resolve(blob);
        },
        mimeType,
        quality
      );
    }
  );
}


/**
 * Get MIME type.
 */
function getMimeType(format) {
  switch (format) {
    case "jpg":
      return "image/jpeg";

    case "webp":
      return "image/webp";

    case "avif":
      return "image/avif";

    case "png":
      return "image/png";

    case "bmp":
      return "image/bmp";

    default:
      return "image/jpeg";
  }
}


/**
 * Compress image.
 *
 * For PNG:
 * Browser PNG encoding is lossless, so the quality
 * slider is implemented by creating a JPEG output.
 *
 * This gives PNG users meaningful compression.
 */
export async function compressImage(
  file,
  quality = 0.8
) {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  const originalFormat =
    detectImageFormat(file);

  const image =
    await loadImage(file);

  const originalWidth =
    image.naturalWidth ||
    image.width;

  const originalHeight =
    image.naturalHeight ||
    image.height;

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    originalWidth;

  canvas.height =
    originalHeight;

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create a canvas context."
    );
  }

  /*
   * PNG, BMP and TIFF can contain
   * transparency.
   *
   * When creating JPEG, fill the
   * transparent background with white.
   */
  const outputFormat =
    originalFormat === "png" ||
    originalFormat === "bmp" ||
    originalFormat === "tiff"
      ? "jpg"
      : originalFormat;

  const mimeType =
    getMimeType(
      outputFormat
    );

  if (
    outputFormat === "jpg"
  ) {
    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  ctx.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob =
    await canvasToBlob(
      canvas,
      mimeType,
      quality
    );

  return {
    blob,
    originalFormat,
    outputFormat,
    mimeType,
    originalWidth,
    originalHeight,
    width: canvas.width,
    height: canvas.height,
  };
}


/**
 * Generate a live compression estimate.
 *
 * This actually encodes the image so the displayed
 * size is based on the current quality value rather
 * than being a simple mathematical guess.
 */
export async function estimateCompressedSize(
  file,
  quality = 0.8
) {
  if (!file) {
    return null;
  }

  const result =
    await compressImage(
      file,
      quality
    );

  return {
    size: result.blob.size,
    outputFormat:
      result.outputFormat,
  };
}


/**
 * Calculate percentage saved.
 */
export function getCompressionPercentage(
  originalSize,
  compressedSize
) {
  if (
    !originalSize ||
    !compressedSize
  ) {
    return 0;
  }

  const percentage =
    ((originalSize -
      compressedSize) /
      originalSize) *
    100;

  return Math.max(
    0,
    Math.round(
      percentage
    )
  );
}


/**
 * Format bytes.
 */
export function formatFileSize(
  bytes
) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    ),
    units.length - 1
  );

  return `${(
    bytes /
    1024 ** index
  ).toFixed(
    index === 0 ? 0 : 1
  )} ${units[index]}`;
}


/**
 * Download compressed image.
 */
export function downloadCompressedImage(
  blob,
  originalName,
  format
) {
  const baseName =
    originalName.replace(
      /\.[^/.]+$/,
      ""
    );

  const extension =
    format === "jpg"
      ? "jpg"
      : format;

  const filename =
    `${baseName}-compressed.${extension}`;

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;

  link.download =
    filename;

  document.body.appendChild(
    link
  );

  link.click();

  link.remove();

  setTimeout(() => {
    URL.revokeObjectURL(
      url
    );
  }, 1000);
}