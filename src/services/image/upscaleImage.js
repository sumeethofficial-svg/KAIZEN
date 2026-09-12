const RESOLUTION_OPTIONS = [
  {
    id: "720p",
    label: "720p",
    height: 720,
  },
  {
    id: "1080p",
    label: "1080p",
    height: 1080,
  },
  {
    id: "1440p",
    label: "1440p",
    height: 1440,
  },
  {
    id: "4k",
    label: "4K",
    height: 2160,
  },
];

export const getResolutionOptions = () => {
  return RESOLUTION_OPTIONS;
};

export const calculateResolution = (
  originalWidth,
  originalHeight,
  targetHeight
) => {
  const aspectRatio = originalWidth / originalHeight;

  return {
    width: Math.round(targetHeight * aspectRatio),
    height: targetHeight,
  };
};

export const getTargetResolution = (
  originalWidth,
  originalHeight,
  targetHeight
) => {
  const target = calculateResolution(
    originalWidth,
    originalHeight,
    targetHeight
  );

  // Never reduce the original image resolution.
  if (
    target.width <= originalWidth &&
    target.height <= originalHeight
  ) {
    return {
      width: originalWidth,
      height: originalHeight,
      isOriginal: true,
    };
  }

  return {
    ...target,
    isOriginal: false,
  };
};

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
      reject(new Error("Unable to load the image."));
    };

    image.src = url;
  });
};

const sharpenCanvas = (
  ctx,
  width,
  height,
  strength
) => {
  if (strength <= 0) {
    return;
  }

  const imageData = ctx.getImageData(
    0,
    0,
    width,
    height
  );

  const source = imageData.data;
  const output = new Uint8ClampedArray(source);

  const amount = Math.min(
    Math.max(strength / 100, 0),
    1
  );

  const centerWeight = 1 + amount * 1.5;
  const neighborWeight = -amount * 0.375;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const index = (y * width + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        const center =
          source[index + channel];

        const top =
          source[
            ((y - 1) * width + x) * 4 +
              channel
          ];

        const bottom =
          source[
            ((y + 1) * width + x) * 4 +
              channel
          ];

        const left =
          source[
            (y * width + (x - 1)) * 4 +
              channel
          ];

        const right =
          source[
            (y * width + (x + 1)) * 4 +
              channel
          ];

        const value =
          center * centerWeight +
          (top + bottom + left + right) *
            neighborWeight;

        output[index + channel] =
          Math.max(
            0,
            Math.min(255, value)
          );
      }
    }
  }

  imageData.data.set(output);
  ctx.putImageData(imageData, 0, 0);
};

export const createUpscalePreview = async (
  file,
  targetHeight,
  sharpening = 30
) => {
  const image = await loadImage(file);

  const resolution = getTargetResolution(
    image.naturalWidth,
    image.naturalHeight,
    targetHeight
  );

  const maxWidth = 900;

  let width = resolution.width;
  let height = resolution.height;

  if (width > maxWidth) {
    const ratio = maxWidth / width;

    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to create image preview."
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

  sharpenCanvas(
    ctx,
    width,
    height,
    sharpening
  );

  return canvas.toDataURL("image/jpeg", 0.92);
};

export const upscaleImage = async (
  file,
  targetHeight,
  sharpening = 30
) => {
  if (!file) {
    throw new Error("Please select an image.");
  }

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

  const image = await loadImage(file);

  const resolution = getTargetResolution(
    image.naturalWidth,
    image.naturalHeight,
    targetHeight
  );

  // Do not downscale an already larger image.
  if (resolution.isOriginal) {
    return {
      blob: file,
      width: image.naturalWidth,
      height: image.naturalHeight,
      mimeType,
    };
  }

  const canvas =
    document.createElement("canvas");

  canvas.width = resolution.width;
  canvas.height = resolution.height;

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
    0,
    0,
    resolution.width,
    resolution.height
  );

  sharpenCanvas(
    ctx,
    resolution.width,
    resolution.height,
    sharpening
  );

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
                "Unable to create the upscaled image."
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
    width: resolution.width,
    height: resolution.height,
    mimeType,
  };
};