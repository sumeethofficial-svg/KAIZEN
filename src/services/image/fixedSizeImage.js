// src/services/image/fixedSizeImage.js

/**
 * Detect the actual image format.
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

  if (
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg"
  ) {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  if (mimeType === "image/avif") {
    return "avif";
  }

  if (mimeType === "image/bmp") {
    return "bmp";
  }

  if (mimeType === "image/tiff") {
    return "tiff";
  }

  if (extension === "jpeg") {
    return "jpg";
  }

  return extension || "unknown";
}


/**
 * Get the correct MIME type.
 */
function getMimeType(format) {
  switch (format) {
    case "jpg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    case "avif":
      return "image/avif";

    case "bmp":
      return "image/bmp";

    default:
      return "";
  }
}


/**
 * Load image into browser.
 */
async function loadImage(file) {
  const url =
    URL.createObjectURL(file);

  try {
    const image =
      new Image();

    image.src = url;

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
    URL.revokeObjectURL(url);
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
                `Your browser could not encode this image as ${mimeType}.`
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
 * Create canvas with high-quality
 * image smoothing.
 */
function createCanvas(
  image,
  width,
  height,
  format
) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    Math.max(
      1,
      Math.round(width)
    );

  canvas.height =
    Math.max(
      1,
      Math.round(height)
    );

  const ctx =
    canvas.getContext(
      "2d"
    );

  if (!ctx) {
    throw new Error(
      "Could not create a canvas context."
    );
  }

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  /*
   * JPG doesn't support
   * transparency.
   *
   * Use white background.
   */
  if (
    format === "jpg"
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

  return {
    canvas,
    ctx,
  };
}


/**
 * Encode image using the
 * SAME format as the source.
 */
async function encodeImage(
  image,
  width,
  height,
  format,
  quality
) {
  const mimeType =
    getMimeType(format);

  if (!mimeType) {
    throw new Error(
      `Unsupported image format: ${format}`
    );
  }

  const {
    canvas,
  } = createCanvas(
    image,
    width,
    height,
    format
  );

  const blob =
    await canvasToBlob(
      canvas,
      mimeType,
      quality
    );

  /*
   * Some browsers silently fall
   * back to PNG when they don't
   * support a requested format.
   *
   * Check the resulting MIME type.
   */
  if (
    blob.type &&
    blob.type !== mimeType
  ) {
    throw new Error(
      `Your browser does not support encoding ${format.toUpperCase()} images.`
    );
  }

  return {
    blob,
    width:
      canvas.width,
    height:
      canvas.height,
    format,
    mimeType,
    quality,
  };
}


/**
 * Find the highest possible
 * quality that remains under
 * the target size.
 *
 * This is used for formats
 * that support lossy quality:
 *
 * JPG
 * WebP
 * AVIF
 */
async function findBestQuality(
  image,
  width,
  height,
  format,
  targetBytes
) {
  let low = 0.05;
  let high = 1;

  let best = null;

  /*
   * Binary search gives us
   * a much better result than
   * randomly trying qualities.
   */
  for (
    let i = 0;
    i < 10;
    i++
  ) {
    const quality =
      (low + high) / 2;

    const candidate =
      await encodeImage(
        image,
        width,
        height,
        format,
        quality
      );

    if (
      candidate.blob.size <=
      targetBytes
    ) {
      /*
       * It fits.
       *
       * Try even higher quality.
       */
      best =
        candidate;

      low =
        quality;
    } else {
      /*
       * Too large.
       *
       * Reduce quality.
       */
      high =
        quality;
    }
  }

  /*
   * If nothing fits, create
   * minimum-quality version.
   */
  if (!best) {
    best =
      await encodeImage(
        image,
        width,
        height,
        format,
        0.05
      );
  }

  return best;
}


/**
 * Check whether the format
 * supports quality control.
 */
function supportsQuality(
  format
) {
  return (
    format === "jpg" ||
    format === "webp" ||
    format === "avif"
  );
}


/**
 * Find the best PNG output.
 *
 * PNG is lossless, therefore
 * changing "quality" does not
 * meaningfully reduce file size.
 *
 * We preserve PNG and reduce
 * dimensions only when required.
 */
async function findBestPng(
  image,
  originalWidth,
  originalHeight,
  targetBytes,
  minimumScale = 0.25
) {
  let scale = 1;

  let best = null;

  while (
    scale >= minimumScale
  ) {
    const width =
      Math.max(
        1,
        Math.round(
          originalWidth *
            scale
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          originalHeight *
            scale
        )
      );

    const candidate =
      await encodeImage(
        image,
        width,
        height,
        "png"
      );

    if (
      candidate.blob.size <=
      targetBytes
    ) {
      best =
        candidate;

      break;
    }

    /*
     * Reduce dimensions by
     * approximately 5%.
     */
    scale -= 0.05;
  }

  /*
   * If target is extremely
   * small, make one final
   * minimum-size attempt.
   */
  if (!best) {
    const width =
      Math.max(
        1,
        Math.round(
          originalWidth *
            minimumScale
        )
      );

    const height =
      Math.max(
        1,
        Math.round(
          originalHeight *
            minimumScale
        )
      );

    best =
      await encodeImage(
        image,
        width,
        height,
        "png"
      );
  }

  return best;
}


/**
 * Main fixed-size compressor.
 *
 * IMPORTANT:
 *
 * The output format ALWAYS
 * matches the input format.
 */
export async function compressToFixedSize(
  file,
  targetBytes,
  options = {}
) {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  if (
    !Number.isFinite(
      targetBytes
    ) ||
    targetBytes <= 0
  ) {
    throw new Error(
      "Please enter a valid target size."
    );
  }

  const image =
    await loadImage(file);

  const sourceFormat =
    detectImageFormat(file);

  const originalWidth =
    image.naturalWidth ||
    image.width;

  const originalHeight =
    image.naturalHeight ||
    image.height;


  /*
   * ------------------------------------------------
   * JPG / WebP / AVIF
   * ------------------------------------------------
   *
   * Preserve dimensions first.
   *
   * Find highest possible quality
   * under the target.
   */
  if (
    supportsQuality(
      sourceFormat
    )
  ) {
    let result =
      await findBestQuality(
        image,
        originalWidth,
        originalHeight,
        sourceFormat,
        targetBytes
      );

    /*
     * If original dimensions
     * cannot reach the target,
     * reduce dimensions gradually.
     */
    if (
      result.blob.size >
      targetBytes
    ) {
      const minimumScale =
        options.minimumScale ||
        0.25;

      let scale = 0.95;

      while (
        scale >=
        minimumScale
      ) {
        const width =
          Math.max(
            1,
            Math.round(
              originalWidth *
                scale
            )
          );

        const height =
          Math.max(
            1,
            Math.round(
              originalHeight *
                scale
            )
          );

        result =
          await findBestQuality(
            image,
            width,
            height,
            sourceFormat,
            targetBytes
          );

        if (
          result.blob.size <=
          targetBytes
        ) {
          return {
            ...result,

            sourceFormat,

            originalWidth,

            originalHeight,

            scale,

            targetBytes,

            exactTarget:
              result.blob.size <=
              targetBytes,
          };
        }

        scale -=
          0.05;
      }
    }

    return {
      ...result,

      sourceFormat,

      originalWidth,

      originalHeight,

      scale:
        result.width /
        originalWidth,

      targetBytes,

      exactTarget:
        result.blob.size <=
        targetBytes,
    };
  }


  /*
   * ------------------------------------------------
   * PNG
   * ------------------------------------------------
   *
   * PNG stays PNG.
   *
   * PNG is lossless, so quality
   * sliders cannot be used like
   * JPEG/WebP.
   *
   * We preserve maximum quality
   * and reduce dimensions only
   * when necessary.
   */
  if (
    sourceFormat === "png"
  ) {
    const result =
      await findBestPng(
        image,
        originalWidth,
        originalHeight,
        targetBytes,
        options.minimumScale ||
          0.25
      );

    return {
      ...result,

      sourceFormat,

      originalWidth,

      originalHeight,

      scale:
        result.width /
        originalWidth,

      targetBytes,

      exactTarget:
        result.blob.size <=
        targetBytes,
    };
  }


  /*
   * ------------------------------------------------
   * Unsupported browser format
   * ------------------------------------------------
   *
   * Never silently convert
   * to another format.
   */
  throw new Error(
    `${sourceFormat.toUpperCase()} output is not supported by your browser. The original format will not be changed automatically.`
  );
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

  const value =
    bytes /
    1024 ** index;

  return `${value.toFixed(
    index === 0
      ? 0
      : value >= 100
        ? 0
        : 1
  )} ${units[index]}`;
}


/**
 * Calculate percentage reduction.
 */
export function getCompressionPercentage(
  originalSize,
  newSize
) {
  if (
    !originalSize ||
    !newSize
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      ((originalSize -
        newSize) /
        originalSize) *
        100
    )
  );
}


/**
 * Download result while
 * preserving its format.
 */
export function downloadFixedSizeImage(
  blob,
  originalName,
  format
) {
  const baseName =
    originalName.replace(
      /\.[^/.]+$/,
      ""
    );

  /*
   * The extension comes from
   * the ACTUAL source format.
   */
  const extension =
    format === "jpg"
      ? "jpg"
      : format;

  const filename =
    `${baseName}-fixed-size.${extension}`;

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