import {
  PDFDocument,
  rgb,
} from "pdf-lib";

/**
 * Supported image types.
 */
const SUPPORTED_TYPES = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Validate a single image file.
 */
function validateImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid image file."
    );
  }

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase();

  const supportedByMime =
    Boolean(
      SUPPORTED_TYPES[file.type]
    );

  const supportedByExtension =
    ["jpg", "jpeg", "png", "webp"].includes(
      extension
    );

  if (
    !supportedByMime &&
    !supportedByExtension
  ) {
    throw new Error(
      `"${file.name}" is not a supported image. Please use JPG, PNG, or WebP.`
    );
  }
}

/**
 * Validate the complete image list.
 */
function validateImageFiles(files) {
  if (!Array.isArray(files)) {
    throw new Error(
      "Please provide an array of images."
    );
  }

  if (files.length === 0) {
    throw new Error(
      "Please add at least one image."
    );
  }

  files.forEach(validateImageFile);
}

/**
 * Load an image into an HTMLImageElement.
 */
async function loadImage(file) {
  const url =
    URL.createObjectURL(file);

  try {
    const image =
      new Image();

    image.decoding = "async";

    image.src = url;

    await new Promise(
      (resolve, reject) => {
        image.onload = resolve;

        image.onerror = () =>
          reject(
            new Error(
              `Unable to read image "${file.name}".`
            )
          );
      }
    );

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Get the actual image dimensions.
 */
async function getImageDimensions(file) {
  const image =
    await loadImage(file);

  return {
    width:
      image.naturalWidth ||
      image.width,

    height:
      image.naturalHeight ||
      image.height,
  };
}

/**
 * Read basic information about all selected images.
 */
export async function getImagesToPdfInfo(
  files
) {
  validateImageFiles(files);

  const imageInfo =
    [];

  for (
    let index = 0;
    index < files.length;
    index += 1
  ) {
    const file = files[index];

    const dimensions =
      await getImageDimensions(
        file
      );

    imageInfo.push({
      name: file.name,
      size: file.size,
      type: file.type,
      width:
        dimensions.width,
      height:
        dimensions.height,
      aspectRatio:
        dimensions.height > 0
          ? dimensions.width /
            dimensions.height
          : 1,
    });
  }

  return {
    count: imageInfo.length,
    totalSize:
      files.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    images: imageInfo,
  };
}

/**
 * Create normalized Images → PDF options.
 */
export function createImagesToPdfOptions(
  options = {}
) {
  return {
    pageSize:
      options.pageSize ||
      "a4",

    orientation:
      options.orientation ||
      "auto",

    fit:
      options.fit ||
      "contain",

    margin:
      Number.isFinite(
        options.margin
      )
        ? Math.max(
            0,
            options.margin
          )
        : 24,

    backgroundColor:
      options.backgroundColor ||
      "#ffffff",

    imageQuality:
      Number.isFinite(
        options.imageQuality
      )
        ? Math.min(
            1,
            Math.max(
              0.1,
              options.imageQuality
            )
          )
        : 0.92,
  };
}

/**
 * Convert a CSS color string into RGB values.
 */
function parseColor(
  color
) {
  const value =
    String(color || "")
      .trim()
      .toLowerCase();

  const namedColors = {
    white: [1, 1, 1],
    black: [0, 0, 0],
  };

  if (
    namedColors[value]
  ) {
    const [
      r,
      g,
      b,
    ] = namedColors[value];

    return rgb(r, g, b);
  }

  const hex =
    value.replace(
      "#",
      ""
    );

  if (
    /^[0-9a-f]{6}$/i.test(
      hex
    )
  ) {
    return rgb(
      parseInt(
        hex.slice(0, 2),
        16
      ) / 255,

      parseInt(
        hex.slice(2, 4),
        16
      ) / 255,

      parseInt(
        hex.slice(4, 6),
        16
      ) / 255
    );
  }

  return rgb(
    1,
    1,
    1
  );
}

/**
 * Standard PDF page sizes in points.
 */
function getPageDimensions(
  pageSize,
  orientation
) {
  const sizes = {
    a4: {
      width: 595.28,
      height: 841.89,
    },

    a3: {
      width: 841.89,
      height: 1190.55,
    },

    letter: {
      width: 612,
      height: 792,
    },

    legal: {
      width: 612,
      height: 1008,
    },
  };

  const base =
    sizes[
      String(
        pageSize
      ).toLowerCase()
    ] ||
    sizes.a4;

  if (
    orientation ===
      "landscape"
  ) {
    return {
      width:
        Math.max(
          base.width,
          base.height
        ),

      height:
        Math.min(
          base.width,
          base.height
        ),
    };
  }

  return {
    width:
      Math.min(
        base.width,
        base.height
      ),

    height:
      Math.max(
        base.width,
        base.height
      ),
  };
}

/**
 * Convert an image into a JPEG byte stream when necessary.
 *
 * WebP cannot always be embedded directly in PDF-lib,
 * so it is rasterized through a canvas.
 */
async function imageToCanvas(
  file,
  quality
) {
  const image =
    await loadImage(file);

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

  const context =
    canvas.getContext(
      "2d",
      {
        alpha: true,
      }
    );

  if (!context) {
    throw new Error(
      `Unable to process image "${file.name}".`
    );
  }

  context.clearRect(
    0,
    0,
    width,
    height
  );

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  const blob =
    await new Promise(
      (resolve) =>
        canvas.toBlob(
          resolve,
          "image/jpeg",
          quality
        )
    );

  if (!blob) {
    throw new Error(
      `Unable to convert image "${file.name}".`
    );
  }

  return new Uint8Array(
    await blob.arrayBuffer()
  );
}

/**
 * Calculate how an image should be placed
 * inside the printable PDF area.
 */
function calculatePlacement(
  imageWidth,
  imageHeight,
  areaWidth,
  areaHeight,
  fit
) {
  const imageRatio =
    imageWidth /
    imageHeight;

  const areaRatio =
    areaWidth /
    areaHeight;

  let width;
  let height;

  if (
    fit === "cover"
  ) {
    if (
      imageRatio >
      areaRatio
    ) {
      height =
        areaHeight;

      width =
        height *
        imageRatio;
    } else {
      width =
        areaWidth;

      height =
        width /
        imageRatio;
    }
  } else {
    /*
     * contain
     */
    if (
      imageRatio >
      areaRatio
    ) {
      width =
        areaWidth;

      height =
        width /
        imageRatio;
    } else {
      height =
        areaHeight;

      width =
        height *
        imageRatio;
    }
  }

  return {
    width,
    height,

    x:
      (areaWidth -
        width) /
      2,

    y:
      (areaHeight -
        height) /
      2,
  };
}

/**
 * Embed the supplied image into the PDF.
 */
async function embedImage(
  pdfDoc,
  file,
  quality
) {
  const type =
    file.type.toLowerCase();

  if (
    type ===
      "image/png" ||
    file.name
      .toLowerCase()
      .endsWith(".png")
  ) {
    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    return {
      image:
        await pdfDoc.embedPng(
          bytes
        ),

      width: null,
      height: null,
    };
  }

  /*
   * JPEG and WebP are normalized through canvas.
   * This also gives us consistent handling for WebP.
   */
  const jpegBytes =
    await imageToCanvas(
      file,
      quality
    );

  return {
    image:
      await pdfDoc.embedJpg(
        jpegBytes
      ),

    width: null,
    height: null,
  };
}

/**
 * Convert multiple images into a single PDF.
 *
 * Every image becomes one PDF page.
 */
export async function imagesToPdf(
  files,
  options = {},
  onProgress
) {
  validateImageFiles(files);

  const normalized =
    createImagesToPdfOptions(
      options
    );

  const pdfDoc =
    await PDFDocument.create();

  const basePage =
    getPageDimensions(
      normalized.pageSize,
      normalized.orientation ===
        "auto"
        ? "portrait"
        : normalized.orientation
    );

  const total =
    files.length;

  for (
    let index = 0;
    index < total;
    index += 1
  ) {
    const file =
      files[index];

    onProgress?.({
      current: index,
      total,
      percent: Math.round(
        (index /
          total) *
          80
      ),
    });

    const dimensions =
      await getImageDimensions(
        file
      );

    let pageWidth =
      basePage.width;

    let pageHeight =
      basePage.height;

    /*
     * AUTO orientation chooses landscape or portrait
     * based on the actual image.
     */
    if (
      normalized.orientation ===
      "auto"
    ) {
      if (
        dimensions.width >
        dimensions.height
      ) {
        pageWidth =
          Math.max(
            basePage.width,
            basePage.height
          );

        pageHeight =
          Math.min(
            basePage.width,
            basePage.height
          );
      } else {
        pageWidth =
          Math.min(
            basePage.width,
            basePage.height
          );

        pageHeight =
          Math.max(
            basePage.width,
            basePage.height
          );
      }
    }

    const page =
      pdfDoc.addPage([
        pageWidth,
        pageHeight,
      ]);

    const background =
      parseColor(
        normalized.backgroundColor
      );

    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: background,
    });

    const margin =
      Math.min(
        normalized.margin,
        pageWidth / 2,
        pageHeight / 2
      );

    const availableWidth =
      Math.max(
        1,
        pageWidth -
          margin * 2
      );

    const availableHeight =
      Math.max(
        1,
        pageHeight -
          margin * 2
      );

    const placement =
      calculatePlacement(
        dimensions.width,
        dimensions.height,
        availableWidth,
        availableHeight,
        normalized.fit
      );

    const {
      image,
    } = await embedImage(
      pdfDoc,
      file,
      normalized.imageQuality
    );

    /*
     * PDF coordinates start from the bottom-left,
     * so convert the top-based placement to PDF space.
     */
    page.drawImage(
      image,
      {
        x:
          margin +
          placement.x,

        y:
          margin +
          availableHeight -
          placement.y -
          placement.height,

        width:
          placement.width,

        height:
          placement.height,
      }
    );

    onProgress?.({
      current:
        index + 1,
      total,
      percent: Math.round(
        ((index + 1) /
          total) *
          80
      ),
    });
  }

  onProgress?.({
    current: total,
    total,
    percent: 90,
  });

  const pdfBytes =
    await pdfDoc.save({
      useObjectStreams: true,
    });

  onProgress?.({
    current: total,
    total,
    percent: 100,
  });

  return new Blob(
    [pdfBytes],
    {
      type:
        "application/pdf",
    }
  );
}