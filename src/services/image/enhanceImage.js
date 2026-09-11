// src/services/image/enhanceImage.js

/**
 * Detect the original image format.
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
 * Get the MIME type for the
 * original image format.
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

    default:
      return null;
  }
}


/**
 * Load an image.
 */
export function loadImage(file) {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      const url =
        URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(url);

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);

        reject(
          new Error(
            "Could not load the image."
          )
        );
      };

      image.src = url;
    }
  );
}


/**
 * Clamp a value between
 * minimum and maximum.
 */
function clamp(
  value,
  min = 0,
  max = 255
) {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}


/**
 * Apply brightness, contrast
 * and saturation directly
 * to image pixels.
 */
function applyColorAdjustments(
  imageData,
  settings
) {
  const data =
    imageData.data;

  const brightness =
    Number(
      settings.brightness
    ) || 0;

  const contrast =
    Number(
      settings.contrast
    ) || 0;

  const saturation =
    Number(
      settings.saturation
    ) || 0;


  /*
   * Brightness:
   *
   * -100 = darker
   * 0    = unchanged
   * +100 = brighter
   */
  const brightnessFactor =
    brightness / 100;


  /*
   * Contrast:
   *
   * -100 = low contrast
   * 0    = unchanged
   * +100 = high contrast
   */
  const contrastFactor =
    (259 *
      (contrast + 255)) /
    (255 *
      (259 - contrast));


  /*
   * Saturation multiplier.
   */
  const saturationFactor =
    1 +
    saturation / 100;


  for (
    let i = 0;
    i < data.length;
    i += 4
  ) {
    let r =
      data[i];

    let g =
      data[i + 1];

    let b =
      data[i + 2];


    /*
     * BRIGHTNESS
     */
    if (
      brightness !== 0
    ) {
      r +=
        255 *
        brightnessFactor;

      g +=
        255 *
        brightnessFactor;

      b +=
        255 *
        brightnessFactor;
    }


    /*
     * CONTRAST
     */
    if (
      contrast !== 0
    ) {
      r =
        contrastFactor *
          (r - 128) +
        128;

      g =
        contrastFactor *
          (g - 128) +
        128;

      b =
        contrastFactor *
          (b - 128) +
        128;
    }


    /*
     * SATURATION
     *
     * Convert toward/away from
     * luminance.
     */
    if (
      saturation !== 0
    ) {
      const gray =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      r =
        gray +
        (r - gray) *
          saturationFactor;

      g =
        gray +
        (g - gray) *
          saturationFactor;

      b =
        gray +
        (b - gray) *
          saturationFactor;
    }


    data[i] =
      clamp(r);

    data[i + 1] =
      clamp(g);

    data[i + 2] =
      clamp(b);
  }

  return imageData;
}


/**
 * Apply a subtle clarity effect.
 *
 * Clarity enhances local contrast
 * without simply increasing
 * global contrast.
 */
function applyClarity(
  imageData,
  amount
) {
  if (
    !amount ||
    amount <= 0
  ) {
    return imageData;
  }

  const width =
    imageData.width;

  const height =
    imageData.height;

  const source =
    imageData.data;

  const output =
    new Uint8ClampedArray(
      source
    );

  /*
   * Amount is intentionally
   * kept controlled.
   */
  const strength =
    Math.min(
      1,
      amount / 100
    ) * 0.35;


  for (
    let y = 1;
    y < height - 1;
    y++
  ) {
    for (
      let x = 1;
      x < width - 1;
      x++
    ) {
      const index =
        (y * width + x) *
        4;

      const left =
        index - 4;

      const right =
        index + 4;

      const top =
        index -
        width * 4;

      const bottom =
        index +
        width * 4;

      for (
        let channel = 0;
        channel < 3;
        channel++
      ) {
        const center =
          source[
            index +
              channel
          ];

        const surrounding =
          (
            source[
              left +
                channel
            ] +
            source[
              right +
                channel
            ] +
            source[
              top +
                channel
            ] +
            source[
              bottom +
                channel
            ]
          ) / 4;

        const detail =
          center -
          surrounding;

        output[
          index +
            channel
        ] =
          clamp(
            center +
              detail *
                strength
          );
      }
    }
  }

  for (
    let i = 0;
    i < output.length;
    i++
  ) {
    imageData.data[i] =
      output[i];
  }

  return imageData;
}


/**
 * Apply sharpening using
 * an unsharp-mask style effect.
 */
function applySharpness(
  imageData,
  amount
) {
  if (
    !amount ||
    amount <= 0
  ) {
    return imageData;
  }

  const width =
    imageData.width;

  const height =
    imageData.height;

  const source =
    imageData.data;

  const output =
    new Uint8ClampedArray(
      source
    );

  /*
   * Keep sharpening controlled
   * to avoid ugly halos.
   */
  const strength =
    Math.min(
      1,
      amount / 100
    ) * 0.65;


  for (
    let y = 1;
    y < height - 1;
    y++
  ) {
    for (
      let x = 1;
      x < width - 1;
      x++
    ) {
      const index =
        (y * width + x) *
        4;

      const left =
        index - 4;

      const right =
        index + 4;

      const top =
        index -
        width * 4;

      const bottom =
        index +
        width * 4;

      for (
        let channel = 0;
        channel < 3;
        channel++
      ) {
        const center =
          source[
            index +
              channel
          ];

        const blur =
          (
            source[
              left +
                channel
            ] +
            source[
              right +
                channel
            ] +
            source[
              top +
                channel
            ] +
            source[
              bottom +
                channel
            ]
          ) / 4;

        const detail =
          center -
          blur;

        output[
          index +
            channel
        ] =
          clamp(
            center +
              detail *
                strength
          );
      }
    }
  }


  for (
    let i = 0;
    i < output.length;
    i++
  ) {
    imageData.data[i] =
      output[i];
  }

  return imageData;
}


/**
 * Enhance an image.
 *
 * Returns a Blob in the
 * ORIGINAL image format.
 */
export async function enhanceImage(
  file,
  settings = {}
) {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  const image =
    await loadImage(file);

  const format =
    detectImageFormat(file);

  const mimeType =
    getMimeType(format);

  if (!mimeType) {
    throw new Error(
      `${format.toUpperCase()} images cannot be exported by this browser without changing format.`
    );
  }


  const width =
    image.naturalWidth ||
    image.width;

  const height =
    image.naturalHeight ||
    image.height;


  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    width;

  canvas.height =
    height;


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
   * JPG does not support
   * transparency.
   */
  if (
    format === "jpg"
  ) {
    ctx.fillStyle =
      "#ffffff";

    ctx.fillRect(
      0,
      0,
      width,
      height
    );
  }


  ctx.drawImage(
    image,
    0,
    0,
    width,
    height
  );


  let imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );


  /*
   * Color adjustments.
   */
  imageData =
    applyColorAdjustments(
      imageData,
      settings
    );


  /*
   * Clarity.
   */
  imageData =
    applyClarity(
      imageData,
      Number(
        settings.clarity
      ) || 0
    );


  /*
   * Sharpness.
   */
  imageData =
    applySharpness(
      imageData,
      Number(
        settings.sharpness
      ) || 0
    );


  ctx.putImageData(
    imageData,
    0,
    0
  );


  /*
   * Export using the
   * ORIGINAL format.
   */
  const quality =
    format === "jpg" ||
    format === "webp" ||
    format === "avif"
      ? 0.95
      : undefined;


  const blob =
    await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(
                new Error(
                  "Image enhancement failed."
                )
              );

              return;
            }

            /*
             * Make sure browser
             * didn't silently convert
             * the format.
             */
            if (
              result.type &&
              result.type !==
                mimeType
            ) {
              reject(
                new Error(
                  `Your browser cannot export ${format.toUpperCase()} in this format.`
                )
              );

              return;
            }

            resolve(result);
          },
          mimeType,
          quality
        );
      }
    );


  return {
    blob,
    format,
    mimeType,
    width,
    height,
  };
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
 * Download enhanced image.
 */
export function downloadEnhancedImage(
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
    `${baseName}-enhanced.${extension}`;


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