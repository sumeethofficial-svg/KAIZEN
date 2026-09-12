const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const getMimeType = (file) => {
  if (SUPPORTED_TYPES.includes(file.type)) {
    return file.type;
  }

  const extension = file.name
    .split(".")
    .pop()
    .toLowerCase();

  const mimeTypes = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    avif: "image/avif",
  };

  return mimeTypes[extension] || "";
};

const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error("Unable to read the image.")
      );
    };

    image.src = url;
  });
};

const canvasToBlob = (canvas, mimeType) => {
  return new Promise((resolve, reject) => {
    let quality;

    if (mimeType === "image/jpeg") {
      quality = 0.96;
    } else if (mimeType === "image/webp") {
      quality = 0.96;
    } else if (mimeType === "image/avif") {
      quality = 0.96;
    }

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(
            new Error(
              "Unable to create the sharpened image."
            )
          );
          return;
        }

        resolve(blob);
      },
      mimeType,
      quality
    );
  });
};

/*
 * Sharpen using an unsharp-style convolution.
 *
 * amount:
 * 0   = no sharpening
 * 100 = strong sharpening
 */
const applySharpen = (
  ctx,
  width,
  height,
  amount
) => {
  if (amount <= 0) {
    return;
  }

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const source = imageData.data;
  const output = new Uint8ClampedArray(
    source
  );

  /*
   * Keep the effect controlled so high
   * values don't create extreme halos.
   */
  const strength =
    0.15 + (amount / 100) * 0.85;

  const center =
    1 + 4 * strength;

  const side = -strength;

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
        (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const top =
          ((y - 1) * width + x) * 4 +
          channel;

        const bottom =
          ((y + 1) * width + x) * 4 +
          channel;

        const left =
          (y * width + x - 1) * 4 +
          channel;

        const right =
          (y * width + x + 1) * 4 +
          channel;

        const value =
          source[index + channel] *
            center +
          source[top] * side +
          source[bottom] * side +
          source[left] * side +
          source[right] * side;

        output[index + channel] =
          Math.max(
            0,
            Math.min(255, value)
          );
      }

      // Preserve alpha exactly.
      output[index + 3] =
        source[index + 3];
    }
  }

  imageData.data.set(output);

  ctx.putImageData(
    imageData,
    0,
    0
  );
};

export const sharpenImage = async (
  file,
  amount = 50,
  options = {}
) => {
  if (!file) {
    throw new Error(
      "Please select an image."
    );
  }

  const mimeType =
    getMimeType(file);

  if (
    !SUPPORTED_TYPES.includes(
      mimeType
    )
  ) {
    throw new Error(
      "Supported formats are JPG, PNG, WebP and AVIF."
    );
  }

  const image =
    await loadImage(file);

  const preview =
    options.preview === true;

  const maxWidth =
    options.maxWidth || 1100;

  const maxHeight =
    options.maxHeight || 750;

  let width =
    image.naturalWidth;

  let height =
    image.naturalHeight;

  /*
   * Preview uses a smaller working canvas
   * so the slider remains responsive.
   *
   * Final export always uses the original
   * full resolution.
   */
  if (preview) {
    const scale = Math.min(
      1,
      maxWidth / width,
      maxHeight / height
    );

    width = Math.max(
      1,
      Math.round(width * scale)
    );

    height = Math.max(
      1,
      Math.round(height * scale)
    );
  }

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = width;
  canvas.height = height;

  const ctx =
    canvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!ctx) {
    throw new Error(
      "Unable to process the image."
    );
  }

  ctx.imageSmoothingEnabled =
    true;

  ctx.imageSmoothingQuality =
    "high";

  ctx.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  applySharpen(
    ctx,
    width,
    height,
    Math.max(
      0,
      Math.min(100, amount)
    )
  );

  if (preview) {
    return {
      dataUrl:
        canvas.toDataURL(
          "image/jpeg",
          0.92
        ),
      width,
      height,
    };
  }

  const blob =
    await canvasToBlob(
      canvas,
      mimeType
    );

  return {
    blob,
    width,
    height,
    mimeType,
  };
};

export const getImageFormat = (
  file
) => {
  const mimeType =
    getMimeType(file);

  switch (mimeType) {
    case "image/jpeg":
      return "JPG";

    case "image/png":
      return "PNG";

    case "image/webp":
      return "WebP";

    case "image/avif":
      return "AVIF";

    default:
      return "Unknown";
  }
};