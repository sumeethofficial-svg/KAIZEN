const getMimeType = (file) => {
  if (file.type) {
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
        new Error("Unable to load the image.")
      );
    };

    image.src = url;
  });
};

export const calculateOutputDimensions = (
  width,
  height,
  rotation
) => {
  const normalized =
    ((rotation % 360) + 360) % 360;

  if (
    normalized === 90 ||
    normalized === 270
  ) {
    return {
      width: height,
      height: width,
    };
  }

  return {
    width,
    height,
  };
};

const createCanvas = (
  image,
  rotation,
  flipHorizontal,
  flipVertical,
  maxPreviewSize = null
) => {
  const originalWidth =
    image.naturalWidth;

  const originalHeight =
    image.naturalHeight;

  const dimensions =
    calculateOutputDimensions(
      originalWidth,
      originalHeight,
      rotation
    );

  let canvasWidth =
    dimensions.width;

  let canvasHeight =
    dimensions.height;

  let scale = 1;

  if (maxPreviewSize) {
    scale = Math.min(
      1,
      maxPreviewSize / canvasWidth,
      maxPreviewSize / canvasHeight
    );

    canvasWidth = Math.max(
      1,
      Math.round(canvasWidth * scale)
    );

    canvasHeight = Math.max(
      1,
      Math.round(canvasHeight * scale)
    );
  }

  const canvas =
    document.createElement("canvas");

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to process the image."
    );
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.save();

  ctx.translate(
    canvasWidth / 2,
    canvasHeight / 2
  );

  ctx.scale(
    flipHorizontal ? -1 : 1,
    flipVertical ? -1 : 1
  );

  ctx.rotate(
    (rotation * Math.PI) / 180
  );

  const drawWidth =
    originalWidth * scale;

  const drawHeight =
    originalHeight * scale;

  ctx.drawImage(
    image,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight
  );

  ctx.restore();

  return canvas;
};

export const createTransformPreview =
  async (
    file,
    rotation,
    flipHorizontal,
    flipVertical
  ) => {
    const image =
      await loadImage(file);

    const canvas = createCanvas(
      image,
      rotation,
      flipHorizontal,
      flipVertical,
      1000
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );
  };

export const rotateFlipImage = async (
  file,
  rotation,
  flipHorizontal,
  flipVertical
) => {
  if (!file) {
    throw new Error(
      "Please select an image."
    );
  }

  const mimeType =
    getMimeType(file);

  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  if (
    !supportedTypes.includes(
      mimeType
    )
  ) {
    throw new Error(
      "Supported formats are JPG, PNG, WebP and AVIF."
    );
  }

  const image =
    await loadImage(file);

  const canvas = createCanvas(
    image,
    rotation,
    flipHorizontal,
    flipVertical
  );

  const quality =
    mimeType === "image/jpeg" ||
    mimeType === "image/webp"
      ? 0.95
      : undefined;

  const blob =
    await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (result) {
              resolve(result);
            } else {
              reject(
                new Error(
                  "Unable to create the transformed image."
                )
              );
            }
          },
          mimeType,
          quality
        );
      }
    );

  return {
    blob,
    width: canvas.width,
    height: canvas.height,
    mimeType,
  };
};