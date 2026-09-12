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
        new Error(
          "Unable to read the image."
        )
      );
    };

    image.src = url;
  });
};

const canvasToBlob = (
  canvas,
  mimeType
) => {
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
              "Unable to create the denoised image."
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
 * Edge-aware denoising.
 *
 * Instead of simply blurring every pixel,
 * neighboring pixels that are close in color
 * receive more weight.
 *
 * This helps smooth random noise while
 * protecting strong edges.
 */
const applyDenoise = (
  ctx,
  width,
  height,
  amount
) => {
  if (amount <= 0) {
    return;
  }

  const imageData =
    ctx.getImageData(
      0,
      0,
      width,
      height
    );

  const source =
    imageData.data;

  const output =
    new Uint8ClampedArray(
      source
    );

  /*
   * Convert 0–100 into a practical
   * filter strength.
   */
  const strength =
    amount / 100;

  /*
   * Spatial influence.
   *
   * Higher denoise values allow the
   * filter to consider a slightly larger
   * neighborhood.
   */
  const radius =
    strength > 0.68 ? 2 : 1;

  /*
   * Larger values make the filter
   * more tolerant of color differences.
   */
  const colorSigma =
    10 + strength * 55;

  const spatialSigma =
    0.9 + strength * 1.2;

  const colorFactor =
    2 *
    colorSigma *
    colorSigma;

  const spatialFactor =
    2 *
    spatialSigma *
    spatialSigma;

  for (
    let y = radius;
    y < height - radius;
    y++
  ) {
    for (
      let x = radius;
      x < width - radius;
      x++
    ) {
      const centerIndex =
        (y * width + x) * 4;

      const centerR =
        source[centerIndex];

      const centerG =
        source[centerIndex + 1];

      const centerB =
        source[centerIndex + 2];

      let red = 0;
      let green = 0;
      let blue = 0;
      let totalWeight = 0;

      for (
        let offsetY = -radius;
        offsetY <= radius;
        offsetY++
      ) {
        for (
          let offsetX = -radius;
          offsetX <= radius;
          offsetX++
        ) {
          const sampleX =
            x + offsetX;

          const sampleY =
            y + offsetY;

          const sampleIndex =
            (sampleY * width +
              sampleX) *
            4;

          const sampleR =
            source[sampleIndex];

          const sampleG =
            source[
              sampleIndex + 1
            ];

          const sampleB =
            source[
              sampleIndex + 2
            ];

          const distanceSquared =
            offsetX * offsetX +
            offsetY * offsetY;

          const colorDistanceSquared =
            (sampleR - centerR) *
              (sampleR - centerR) +
            (sampleG - centerG) *
              (sampleG - centerG) +
            (sampleB - centerB) *
              (sampleB - centerB);

          const spatialWeight =
            Math.exp(
              -distanceSquared /
                spatialFactor
            );

          const colorWeight =
            Math.exp(
              -colorDistanceSquared /
                colorFactor
            );

          const weight =
            spatialWeight *
            colorWeight;

          red +=
            sampleR * weight;

          green +=
            sampleG * weight;

          blue +=
            sampleB * weight;

          totalWeight += weight;
        }
      }

      if (totalWeight > 0) {
        const filteredR =
          red / totalWeight;

        const filteredG =
          green / totalWeight;

        const filteredB =
          blue / totalWeight;

        /*
         * Blend the filtered result with
         * the original according to the
         * selected strength.
         *
         * This prevents low values from
         * destroying natural texture.
         */
        const blend =
          0.18 +
          strength * 0.82;

        output[
          centerIndex
        ] =
          centerR +
          (filteredR - centerR) *
            blend;

        output[
          centerIndex + 1
        ] =
          centerG +
          (filteredG - centerG) *
            blend;

        output[
          centerIndex + 2
        ] =
          centerB +
          (filteredB - centerB) *
            blend;

        /*
         * Preserve transparency exactly.
         */
        output[
          centerIndex + 3
        ] =
          source[
            centerIndex + 3
          ];
      }
    }
  }

  /*
   * Keep the untouched border pixels.
   */
  imageData.data.set(output);

  ctx.putImageData(
    imageData,
    0,
    0
  );
};

export const denoiseImage = async (
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

  const isPreview =
    options.preview === true;

  let width =
    image.naturalWidth;

  let height =
    image.naturalHeight;

  /*
   * Preview is processed at a smaller
   * resolution so slider changes remain
   * responsive.
   */
  if (isPreview) {
    const maxWidth =
      options.maxWidth || 900;

    const maxHeight =
      options.maxHeight || 650;

    const scale =
      Math.min(
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

  applyDenoise(
    ctx,
    width,
    height,
    Math.max(
      0,
      Math.min(100, amount)
    )
  );

  /*
   * Preview can safely use JPEG because
   * this is only the UI preview.
   *
   * The actual exported image below
   * always keeps the original format.
   */
  if (isPreview) {
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