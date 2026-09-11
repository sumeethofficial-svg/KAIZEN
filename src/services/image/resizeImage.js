// src/services/image/resizeImage.js

/**
 * Detect image format.
 */
export function detectImageFormat(file) {
  if (!file) {
    return "unknown";
  }

  const mimeType =
    (file.type || "").toLowerCase();

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

    image.src =
      objectUrl;

    await new Promise(
      (resolve, reject) => {
        image.onload =
          resolve;

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
                "Could not create resized image."
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
export function getMimeType(
  format
) {
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
 * Resize image.
 *
 * width / height:
 * Target dimensions.
 *
 * quality:
 * Output quality from 0.1 to 1.
 *
 * format:
 * Output image format.
 */
export async function resizeImage(
  file,
  width,
  height,
  quality = 0.92,
  format = null
) {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error(
      "Invalid image dimensions."
    );
  }

  const image =
    await loadImage(file);

  const originalWidth =
    image.naturalWidth ||
    image.width;

  const originalHeight =
    image.naturalHeight ||
    image.height;

  const outputFormat =
    format ||
    detectImageFormat(file);

  /*
   * Canvas supports these
   * formats reliably.
   */
  const safeFormat =
    [
      "jpg",
      "png",
      "webp",
      "avif",
      "bmp",
    ].includes(
      outputFormat
    )
      ? outputFormat
      : "jpg";

  const mimeType =
    getMimeType(
      safeFormat
    );

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    Math.round(width);

  canvas.height =
    Math.round(height);

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
   * Better image resizing.
   */
  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  /*
   * JPEG does not support
   * transparency.
   *
   * Use white background.
   */
  if (
    safeFormat === "jpg"
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
    originalWidth,
    originalHeight,
    width: canvas.width,
    height: canvas.height,
    format: safeFormat,
    mimeType,
  };
}


/**
 * Format dimensions.
 */
export function formatDimensions(
  width,
  height
) {
  return `${width} × ${height}`;
}


/**
 * Format file size.
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

  const index =
    Math.min(
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
 * Calculate percentage
 * change in dimensions.
 */
export function getResizePercentage(
  originalWidth,
  originalHeight,
  newWidth,
  newHeight
) {
  if (
    !originalWidth ||
    !originalHeight
  ) {
    return 0;
  }

  const originalArea =
    originalWidth *
    originalHeight;

  const newArea =
    newWidth *
    newHeight;

  return Math.round(
    (newArea /
      originalArea) *
      100
  );
}


/**
 * Download resized image.
 */
export function downloadResizedImage(
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
    `${baseName}-resized.${extension}`;

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    url;

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