const SUPPORTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

const getMimeType = (file) => {
  if (
    SUPPORTED_TYPES.includes(file.type)
  ) {
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
  return new Promise(
    (resolve, reject) => {
      const image = new Image();

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
            "Unable to read the image."
          )
        );
      };

      image.src = url;
    }
  );
};

const canvasToBlob = (
  canvas,
  mimeType
) => {
  return new Promise(
    (resolve, reject) => {
      /*
       * Use maximum quality for lossy formats.
       * PNG remains lossless.
       */
      const quality =
        mimeType === "image/jpeg" ||
        mimeType === "image/webp" ||
        mimeType === "image/avif"
          ? 1
          : undefined;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "Your browser could not create the cleaned image."
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
};

export const removeImageMetadata =
  async (file) => {
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

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      image.naturalWidth;

    canvas.height =
      image.naturalHeight;

    const ctx =
      canvas.getContext("2d", {
        alpha: true,
      });

    if (!ctx) {
      throw new Error(
        "Unable to process the image."
      );
    }

    /*
     * Draw the image onto a fresh canvas.
     *
     * The original file container is not
     * copied. The image is decoded into
     * pixels and then encoded as a new file,
     * removing the original EXIF/XMP/IPTC
     * metadata.
     */
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
        mimeType
      );

    return {
      blob,
      width: canvas.width,
      height: canvas.height,
      mimeType,
    };
  };

export const createMetadataPreview =
  async (file) => {
    if (!file) {
      return null;
    }

    const image =
      await loadImage(file);

    const maxWidth = 1000;
    const maxHeight = 650;

    const scale = Math.min(
      1,
      maxWidth / image.naturalWidth,
      maxHeight / image.naturalHeight
    );

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width = Math.max(
      1,
      Math.round(
        image.naturalWidth * scale
      )
    );

    canvas.height = Math.max(
      1,
      Math.round(
        image.naturalHeight * scale
      )
    );

    const ctx =
      canvas.getContext("2d");

    if (!ctx) {
      throw new Error(
        "Unable to create preview."
      );
    }

    ctx.drawImage(
      image,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas.toDataURL(
      "image/jpeg",
      0.92
    );
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