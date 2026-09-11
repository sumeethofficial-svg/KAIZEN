// src/services/image/convertImage.js

export const IMAGE_FORMATS = [
  {
    id: "png",
    name: "PNG",
    mime: "image/png",
    extension: "png",
  },
  {
    id: "jpg",
    name: "JPG",
    mime: "image/jpeg",
    extension: "jpg",
  },
  {
    id: "webp",
    name: "WebP",
    mime: "image/webp",
    extension: "webp",
  },
  {
    id: "avif",
    name: "AVIF",
    mime: "image/avif",
    extension: "avif",
  },
  {
    id: "bmp",
    name: "BMP",
    mime: "image/bmp",
    extension: "bmp",
  },
  {
    id: "svg",
    name: "SVG",
    mime: "image/svg+xml",
    extension: "svg",
  },
  {
    id: "ico",
    name: "ICO",
    mime: "image/x-icon",
    extension: "ico",
  },
  {
    id: "tiff",
    name: "TIFF",
    mime: "image/tiff",
    extension: "tiff",
  },
  {
    id: "ppm",
    name: "PPM",
    mime: "image/x-portable-pixmap",
    extension: "ppm",
  },
];

/**
 * Detect the input image format.
 */
export function detectImageFormat(file) {
  if (!file) {
    return "unknown";
  }

  const mimeType = (
    file.type || ""
  ).toLowerCase();

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
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
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
 * Load image into browser memory.
 */
async function loadImage(file) {
  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image =
      new Image();

    image.src = objectUrl;

    await new Promise(
      (resolve, reject) => {
        image.onload = resolve;

        image.onerror = () => {
          reject(
            new Error(
              "This image could not be decoded by the browser."
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
 * Create a canvas from an image.
 */
function createCanvas(image) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    image.naturalWidth ||
    image.width;

  canvas.height =
    image.naturalHeight ||
    image.height;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Could not create a canvas context."
    );
  }

  ctx.drawImage(
    image,
    0,
    0
  );

  return canvas;
}

/**
 * Convert canvas to Blob.
 */
function canvasToBlob(
  canvas,
  mimeType,
  quality = 0.9
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                `Browser cannot create ${mimeType}.`
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
 * Convert canvas to BMP.
 */
function canvasToBMP(canvas) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const pixels =
    ctx.getImageData(
      0,
      0,
      width,
      height
    ).data;

  const rowSize =
    Math.ceil(
      (width * 3) / 4
    ) * 4;

  const imageSize =
    rowSize * height;

  const fileSize =
    54 + imageSize;

  const buffer =
    new ArrayBuffer(
      fileSize
    );

  const view =
    new DataView(buffer);

  // BMP signature
  view.setUint8(
    0,
    0x42
  );

  view.setUint8(
    1,
    0x4d
  );

  // File size
  view.setUint32(
    2,
    fileSize,
    true
  );

  // Pixel offset
  view.setUint32(
    10,
    54,
    true
  );

  // DIB header size
  view.setUint32(
    14,
    40,
    true
  );

  // Width
  view.setInt32(
    18,
    width,
    true
  );

  // Negative height = top-down
  view.setInt32(
    22,
    -height,
    true
  );

  // Color planes
  view.setUint16(
    26,
    1,
    true
  );

  // 24-bit
  view.setUint16(
    28,
    24,
    true
  );

  // No compression
  view.setUint32(
    30,
    0,
    true
  );

  // Image size
  view.setUint32(
    34,
    imageSize,
    true
  );

  let offset = 54;

  for (
    let y = 0;
    y < height;
    y++
  ) {
    for (
      let x = 0;
      x < width;
      x++
    ) {
      const pixel =
        (y * width + x) * 4;

      // BMP uses BGR
      view.setUint8(
        offset++,
        pixels[pixel + 2]
      );

      view.setUint8(
        offset++,
        pixels[pixel + 1]
      );

      view.setUint8(
        offset++,
        pixels[pixel]
      );
    }

    while (
      (offset - 54) %
        rowSize !==
      0
    ) {
      view.setUint8(
        offset++,
        0
      );
    }
  }

  return new Blob(
    [buffer],
    {
      type: "image/bmp",
    }
  );
}

/**
 * Convert canvas to PPM.
 */
function canvasToPPM(canvas) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const pixels =
    ctx.getImageData(
      0,
      0,
      width,
      height
    ).data;

  const header =
    `P6\n${width} ${height}\n255\n`;

  const rgb =
    new Uint8Array(
      width *
        height *
        3
    );

  let index = 0;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    rgb[index++] =
      pixels[i];

    rgb[index++] =
      pixels[i + 1];

    rgb[index++] =
      pixels[i + 2];
  }

  return new Blob(
    [header, rgb],
    {
      type:
        "image/x-portable-pixmap",
    }
  );
}

/**
 * Convert canvas to SVG.
 *
 * Note:
 * This puts the raster image inside an SVG.
 * It does not vectorize the image.
 */
function canvasToSVG(canvas) {
  const pngData =
    canvas.toDataURL(
      "image/png"
    );

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${canvas.width}"
  height="${canvas.height}"
  viewBox="0 0 ${canvas.width} ${canvas.height}"
>
  <image
    href="${pngData}"
    width="${canvas.width}"
    height="${canvas.height}"
  />
</svg>`;

  return new Blob(
    [svg],
    {
      type: "image/svg+xml",
    }
  );
}

/**
 * Convert canvas to ICO.
 */
async function canvasToICO(canvas) {
  const pngBlob =
    await canvasToBlob(
      canvas,
      "image/png"
    );

  const pngData =
    new Uint8Array(
      await pngBlob.arrayBuffer()
    );

  const header =
    new ArrayBuffer(22);

  const view =
    new DataView(header);

  // Reserved
  view.setUint16(
    0,
    0,
    true
  );

  // Icon type
  view.setUint16(
    2,
    1,
    true
  );

  // Image count
  view.setUint16(
    4,
    1,
    true
  );

  // Width
  view.setUint8(
    6,
    canvas.width >= 256
      ? 0
      : canvas.width
  );

  // Height
  view.setUint8(
    7,
    canvas.height >= 256
      ? 0
      : canvas.height
  );

  // Palette
  view.setUint8(
    8,
    0
  );

  // Reserved
  view.setUint8(
    9,
    0
  );

  // Color planes
  view.setUint16(
    10,
    1,
    true
  );

  // Bits per pixel
  view.setUint16(
    12,
    32,
    true
  );

  // PNG size
  view.setUint32(
    14,
    pngData.length,
    true
  );

  // PNG offset
  view.setUint32(
    18,
    22,
    true
  );

  return new Blob(
    [header, pngData],
    {
      type:
        "image/x-icon",
    }
  );
}

/**
 * Convert canvas to TIFF.
 */
function canvasToTIFF(canvas) {
  const width =
    canvas.width;

  const height =
    canvas.height;

  const ctx =
    canvas.getContext(
      "2d",
      {
        willReadFrequently:
          true,
      }
    );

  const pixels =
    ctx.getImageData(
      0,
      0,
      width,
      height
    ).data;

  const rgb =
    new Uint8Array(
      width *
        height *
        3
    );

  let index = 0;

  for (
    let i = 0;
    i < pixels.length;
    i += 4
  ) {
    rgb[index++] =
      pixels[i];

    rgb[index++] =
      pixels[i + 1];

    rgb[index++] =
      pixels[i + 2];
  }

  const entries = 11;

  const ifdOffset = 8;

  const ifdSize =
    2 +
    entries * 12 +
    4;

  const bitsOffset =
    ifdOffset +
    ifdSize;

  const xResolutionOffset =
    bitsOffset + 6;

  const yResolutionOffset =
    xResolutionOffset + 8;

  const pixelOffset =
    yResolutionOffset + 8;

  const buffer =
    new ArrayBuffer(
      pixelOffset +
        rgb.length
    );

  const view =
    new DataView(buffer);

  // TIFF header
  view.setUint8(
    0,
    0x49
  );

  view.setUint8(
    1,
    0x49
  );

  view.setUint16(
    2,
    42,
    true
  );

  view.setUint32(
    4,
    ifdOffset,
    true
  );

  view.setUint16(
    ifdOffset,
    entries,
    true
  );

  const writeTag = (
    index,
    type,
    count,
    value
  ) => {
    const offset =
      ifdOffset +
      2 +
      index * 12;

    view.setUint16(
      offset,
      type,
      true
    );

    view.setUint32(
      offset + 2,
      count,
      true
    );

    if (
      type === 3 &&
      count === 1
    ) {
      view.setUint16(
        offset + 6,
        value,
        true
      );
    } else {
      view.setUint32(
        offset + 6,
        value,
        true
      );
    }
  };

  // Width
  writeTag(
    0,
    4,
    1,
    width
  );

  // Height
  writeTag(
    1,
    4,
    1,
    height
  );

  // Bits per sample
  writeTag(
    2,
    3,
    3,
    bitsOffset
  );

  // Compression
  writeTag(
    3,
    3,
    1,
    1
  );

  // RGB
  writeTag(
    4,
    3,
    1,
    2
  );

  // Pixel offset
  writeTag(
    5,
    4,
    1,
    pixelOffset
  );

  // Samples per pixel
  writeTag(
    6,
    3,
    1,
    3
  );

  // Rows per strip
  writeTag(
    7,
    4,
    1,
    height
  );

  // Strip byte count
  writeTag(
    8,
    4,
    1,
    rgb.length
  );

  // X resolution
  writeTag(
    9,
    5,
    1,
    xResolutionOffset
  );

  // Y resolution
  writeTag(
    10,
    5,
    1,
    yResolutionOffset
  );

  // Next IFD
  view.setUint32(
    ifdOffset +
      2 +
      entries * 12,
    0,
    true
  );

  // Bits per channel
  view.setUint16(
    bitsOffset,
    8,
    true
  );

  view.setUint16(
    bitsOffset + 2,
    8,
    true
  );

  view.setUint16(
    bitsOffset + 4,
    8,
    true
  );

  // 72 DPI
  view.setUint32(
    xResolutionOffset,
    72,
    true
  );

  view.setUint32(
    xResolutionOffset + 4,
    1,
    true
  );

  view.setUint32(
    yResolutionOffset,
    72,
    true
  );

  view.setUint32(
    yResolutionOffset + 4,
    1,
    true
  );

  new Uint8Array(
    buffer,
    pixelOffset
  ).set(rgb);

  return new Blob(
    [buffer],
    {
      type: "image/tiff",
    }
  );
}

/**
 * Main image conversion function.
 */
export async function convertImage(
  file,
  format = "image/png",
  quality = 0.9
) {
  if (!file) {
    throw new Error(
      "No image selected."
    );
  }

  const targetFormat =
    format
      .replace(
        "image/",
        ""
      )
      .replace(
        "jpeg",
        "jpg"
      )
      .replace(
        "x-icon",
        "ico"
      )
      .replace(
        "x-portable-pixmap",
        "ppm"
      );

  const image =
    await loadImage(file);

  const canvas =
    createCanvas(image);

  let blob;

  switch (targetFormat) {
    case "png":
      blob =
        await canvasToBlob(
          canvas,
          "image/png"
        );
      break;

    case "jpg":
    case "jpeg": {
      const jpgCanvas =
        document.createElement(
          "canvas"
        );

      jpgCanvas.width =
        canvas.width;

      jpgCanvas.height =
        canvas.height;

      const ctx =
        jpgCanvas.getContext(
          "2d"
        );

      // JPEG doesn't support
      // transparent pixels.
      ctx.fillStyle =
        "#ffffff";

      ctx.fillRect(
        0,
        0,
        jpgCanvas.width,
        jpgCanvas.height
      );

      ctx.drawImage(
        canvas,
        0,
        0
      );

      blob =
        await canvasToBlob(
          jpgCanvas,
          "image/jpeg",
          quality
        );

      break;
    }

    case "webp":
      blob =
        await canvasToBlob(
          canvas,
          "image/webp",
          quality
        );
      break;

    case "avif":
      blob =
        await canvasToBlob(
          canvas,
          "image/avif",
          quality
        );
      break;

    case "bmp":
      blob =
        canvasToBMP(canvas);
      break;

    case "svg":
      blob =
        canvasToSVG(canvas);
      break;

    case "ico":
      blob =
        await canvasToICO(canvas);
      break;

    case "tiff":
      blob =
        canvasToTIFF(canvas);
      break;

    case "ppm":
      blob =
        canvasToPPM(canvas);
      break;

    default:
      throw new Error(
        `Unsupported output format: ${targetFormat}`
      );
  }

  return blob;
}

/**
 * Download converted image.
 */
export function downloadConvertedImage(
  blob,
  originalName,
  format
) {
  const baseName =
    originalName.replace(
      /\.[^/.]+$/,
      ""
    );

  const filename =
    `${baseName}-converted.${format}`;

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href = url;
  link.download = filename;

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

  const index = Math.min(
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