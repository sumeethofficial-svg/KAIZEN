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

export const cropImage = async (
  file,
  crop,
  outputWidth,
  outputHeight
) => {
  if (!file) {
    throw new Error("Please select an image.");
  }

  const image = await loadImage(file);

  const canvas =
    document.createElement("canvas");

  canvas.width = Math.round(outputWidth);
  canvas.height = Math.round(outputHeight);

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to process the image."
    );
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  const mimeType = getMimeType(file);

  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
  ];

  if (!supportedTypes.includes(mimeType)) {
    throw new Error(
      "Supported formats are JPG, PNG, WebP and AVIF."
    );
  }

  const quality =
    mimeType === "image/jpeg" ||
    mimeType === "image/webp"
      ? 0.95
      : undefined;

  const blob = await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(
              new Error(
                "Unable to create the cropped image."
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
    width: outputWidth,
    height: outputHeight,
    mimeType,
  };
};

export const createCropPreview = async (
  file,
  crop,
  previewWidth = 900
) => {
  const image = await loadImage(file);

  const scale =
    previewWidth / image.naturalWidth;

  const width = previewWidth;

  const height = Math.round(
    image.naturalHeight * scale
  );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to create preview."
    );
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  return canvas.toDataURL(
    "image/jpeg",
    0.92
  );
};