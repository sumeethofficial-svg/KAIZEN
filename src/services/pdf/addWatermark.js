import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

/**
 * Load a PDF and return basic information.
 */
export async function getWatermarkPdfInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer =
    await file.arrayBuffer();

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  return {
    pageCount:
      pdf.getPageCount(),
    pages: Array.from(
      { length: pdf.getPageCount() },
      (_, index) => {
        const page =
          pdf.getPage(index);

        return {
          pageNumber: index + 1,
          width: page.getWidth(),
          height: page.getHeight(),
          rotation:
            page.getRotation()
              .angle,
        };
      }
    ),
  };
}

/**
 * Clamp a value.
 */
function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      value,
      min
    ),
    max
  );
}

/**
 * Normalize RGB input.
 *
 * Supports:
 * [0, 0, 0]
 * [255, 255, 255]
 */
function normalizeColor(
  color,
  fallback = [0, 0, 0]
) {
  if (
    !Array.isArray(color) ||
    color.length !== 3
  ) {
    return fallback;
  }

  const values =
    color.map(Number);

  if (
    values.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    return fallback;
  }

  const divisor =
    values.some(
      (value) =>
        value > 1
    )
      ? 255
      : 1;

  return values.map(
    (value) =>
      clamp(
        value /
          divisor,
        0,
        1
      )
  );
}

/**
 * Validate normalized position.
 *
 * x/y are 0..1 relative to the page.
 * Origin is top-left in the UI.
 */
function validatePosition(
  position
) {
  if (
    !position ||
    typeof position !==
      "object"
  ) {
    throw new Error(
      "Invalid watermark position."
    );
  }

  const x = Number(
    position.x
  );

  const y = Number(
    position.y
  );

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    throw new Error(
      "Watermark position must be between 0 and 1."
    );
  }

  return {
    x,
    y,
  };
}

/**
 * Convert normalized top-left
 * coordinates to PDF bottom-left
 * coordinates.
 */
function positionToPdf(
  position,
  pageWidth,
  pageHeight
) {
  const normalized =
    validatePosition(
      position
    );

  return {
    x:
      normalized.x *
      pageWidth,

    y:
      pageHeight -
      normalized.y *
        pageHeight,
  };
}

/**
 * Determine watermark pages.
 */
function resolvePageNumbers(
  pageSelection,
  pageCount
) {
  if (
    pageSelection ===
      "all" ||
    pageSelection ===
      undefined ||
    pageSelection === null
  ) {
    return Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        index + 1
    );
  }

  if (
    pageSelection ===
    "first"
  ) {
    return [1];
  }

  if (
    pageSelection ===
    "last"
  ) {
    return [pageCount];
  }

  if (
    Array.isArray(
      pageSelection
    )
  ) {
    const pages =
      pageSelection
        .map(Number)
        .filter(
          (pageNumber) =>
            Number.isInteger(
              pageNumber
            ) &&
            pageNumber >= 1 &&
            pageNumber <=
              pageCount
        );

    const uniquePages =
      [...new Set(pages)];

    if (
      uniquePages.length ===
      0
    ) {
      throw new Error(
        "No valid watermark pages were selected."
      );
    }

    return uniquePages;
  }

  throw new Error(
    "Invalid watermark page selection."
  );
}

/**
 * Draw a text watermark.
 */
async function drawTextWatermark(
  page,
  pdf,
  watermark
) {
  const text =
    String(
      watermark.text ?? ""
    ).trim();

  if (!text) {
    throw new Error(
      "Watermark text cannot be empty."
    );
  }

  const fontName =
    watermark.font ===
    "times"
      ? StandardFonts.TimesRoman
      : watermark.font ===
        "courier"
      ? StandardFonts.Courier
      : StandardFonts.Helvetica;

  const font =
    await pdf.embedFont(
      fontName
    );

  const pageWidth =
    page.getWidth();

  const pageHeight =
    page.getHeight();

  const position =
    positionToPdf(
      watermark.position ||
        {
          x: 0.5,
          y: 0.5,
        },
      pageWidth,
      pageHeight
    );

  const requestedSize =
    Number(
      watermark.fontSize ??
        44
    );

  const fontSize =
    Number.isFinite(
      requestedSize
    ) &&
    requestedSize > 0
      ? requestedSize
      : 44;

  const color =
    normalizeColor(
      watermark.color,
      [
        0.5,
        0.5,
        0.5,
      ]
    );

  const opacity =
    clamp(
      Number(
        watermark.opacity ??
          0.18
      ),
      0,
      1
    );

  const rotation =
    Number(
      watermark.rotation ??
        0
    );

  const textWidth =
    font.widthOfTextAtSize(
      text,
      fontSize
    );

  const textHeight =
    font.heightAtSize(
      fontSize
    );

  let drawX =
    position.x;

  let drawY =
    position.y;

  const alignment =
    watermark.alignment ||
    "center";

  if (
    alignment ===
    "center"
  ) {
    drawX =
      position.x -
      textWidth / 2;
  }

  if (
    alignment ===
    "right"
  ) {
    drawX =
      position.x -
      textWidth;
  }

  drawY =
    position.y -
    textHeight / 2;

  page.drawText(
    text,
    {
      x: drawX,
      y: drawY,
      size: fontSize,
      font,
      color: rgb(
        color[0],
        color[1],
        color[2]
      ),
      opacity,
      rotate:
        degrees(
          rotation
        ),
    }
  );
}

/**
 * Draw an image watermark.
 */
async function drawImageWatermark(
  page,
  pdf,
  watermark
) {
  if (!watermark.image) {
    throw new Error(
      "No watermark image was provided."
    );
  }

  let bytes;

  if (
    watermark.image instanceof
      Blob ||
    watermark.image instanceof
      File
  ) {
    bytes =
      await watermark.image.arrayBuffer();
  } else if (
    watermark.image instanceof
    ArrayBuffer
  ) {
    bytes =
      watermark.image;
  } else if (
    ArrayBuffer.isView(
      watermark.image
    )
  ) {
    bytes =
      watermark.image.buffer;
  } else {
    throw new Error(
      "Watermark image must be a File, Blob, or ArrayBuffer."
    );
  }

  const mimeType =
    watermark.image?.type
      ?.toLowerCase?.() ||
    "";

  let image;

  if (
    mimeType.includes(
      "png"
    )
  ) {
    image =
      await pdf.embedPng(
        bytes
      );
  } else if (
    mimeType.includes(
      "jpeg"
    ) ||
    mimeType.includes(
      "jpg"
    )
  ) {
    image =
      await pdf.embedJpg(
        bytes
      );
  } else {
    const bytesView =
      new Uint8Array(
        bytes
      );

    const isPng =
      bytesView.length >=
        8 &&
      bytesView[0] ===
        0x89 &&
      bytesView[1] ===
        0x50 &&
      bytesView[2] ===
        0x4e &&
      bytesView[3] ===
        0x47;

    const isJpeg =
      bytesView.length >=
        2 &&
      bytesView[0] ===
        0xff &&
      bytesView[1] ===
        0xd8;

    if (isPng) {
      image =
        await pdf.embedPng(
          bytes
        );
    } else if (
      isJpeg
    ) {
      image =
        await pdf.embedJpg(
          bytes
        );
    } else {
      throw new Error(
        "Watermark image must be PNG or JPEG."
      );
    }
  }

  const pageWidth =
    page.getWidth();

  const pageHeight =
    page.getHeight();

  const position =
    positionToPdf(
      watermark.position ||
        {
          x: 0.5,
          y: 0.5,
        },
      pageWidth,
      pageHeight
    );

  const requestedWidth =
    Number(
      watermark.width ??
        pageWidth *
          0.35
    );

  const imageWidth =
    image.width || 1;

  const imageHeight =
    image.height || 1;

  const aspectRatio =
    imageHeight /
    imageWidth;

  const width =
    Number.isFinite(
      requestedWidth
    ) &&
    requestedWidth >
      0
      ? Math.min(
          requestedWidth,
          pageWidth
        )
      : pageWidth *
        0.35;

  const height =
    width *
    aspectRatio;

  const opacity =
    clamp(
      Number(
        watermark.opacity ??
          0.18
      ),
      0,
      1
    );

  const rotation =
    Number(
      watermark.rotation ??
        0
    );

  page.drawImage(
    image,
    {
      x:
        position.x -
        width / 2,

      y:
        position.y -
        height / 2,

      width,
      height,

      opacity,

      rotate:
        degrees(
          rotation
        ),
    }
  );
}

/**
 * Create a text watermark object.
 */
export function createTextWatermark(
  text,
  options = {}
) {
  return {
    type: "text",
    text,
    font:
      options.font ??
      "helvetica",
    fontSize:
      options.fontSize ??
      44,
    color:
      options.color ??
      [
        128,
        128,
        128,
      ],
    opacity:
      options.opacity ??
      0.18,
    rotation:
      options.rotation ??
      -35,
    alignment:
      options.alignment ??
      "center",
    position:
      options.position ?? {
        x: 0.5,
        y: 0.5,
      },
    pageSelection:
      options.pageSelection ??
      "all",
  };
}

/**
 * Create an image watermark object.
 */
export function createImageWatermark(
  image,
  options = {}
) {
  return {
    type: "image",
    image,
    width:
      options.width ??
      null,
    opacity:
      options.opacity ??
      0.18,
    rotation:
      options.rotation ??
      0,
    position:
      options.position ?? {
        x: 0.5,
        y: 0.5,
      },
    pageSelection:
      options.pageSelection ??
      "all",
  };
}

/**
 * Apply a watermark to a PDF.
 *
 * Text example:
 *
 * {
 *   type: "text",
 *   text: "CONFIDENTIAL",
 *   fontSize: 48,
 *   opacity: 0.18,
 *   rotation: -35,
 *   position: {
 *     x: 0.5,
 *     y: 0.5
 *   },
 *   pageSelection: "all"
 * }
 *
 * Image example:
 *
 * {
 *   type: "image",
 *   image: File,
 *   width: 180,
 *   opacity: 0.2,
 *   position: {
 *     x: 0.5,
 *     y: 0.5
 *   }
 * }
 */
export async function addWatermark(
  file,
  watermark,
  options = {},
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  if (
    !watermark ||
    typeof watermark !==
      "object"
  ) {
    throw new Error(
      "Watermark configuration is required."
    );
  }

  if (
    watermark.type !==
      "text" &&
    watermark.type !==
      "image"
  ) {
    throw new Error(
      "Watermark must be either text or image."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(5);
  }

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  const pageCount =
    pdf.getPageCount();

  if (
    pageCount < 1
  ) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  if (
    watermark.type ===
    "text"
  ) {
    if (
      !String(
        watermark.text ??
          ""
      ).trim()
    ) {
      throw new Error(
        "Watermark text cannot be empty."
      );
    }
  }

  if (
    watermark.type ===
    "image" &&
    !watermark.image
  ) {
    throw new Error(
      "Please provide a watermark image."
    );
  }

  const pageSelection =
    watermark.pageSelection ??
    options.pageSelection ??
    "all";

  const pageNumbers =
    resolvePageNumbers(
      pageSelection,
      pageCount
    );

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(10);
  }

  let processed =
    0;

  for (
    const pageNumber of
      pageNumbers
  ) {
    const page =
      pdf.getPage(
        pageNumber - 1
      );

    if (
      watermark.type ===
      "text"
    ) {
      await drawTextWatermark(
        page,
        pdf,
        watermark
      );
    }

    if (
      watermark.type ===
      "image"
    ) {
      await drawImageWatermark(
        page,
        pdf,
        watermark
      );
    }

    processed += 1;

    if (
      typeof onProgress ===
      "function"
    ) {
      const percentage =
        10 +
        Math.round(
          (processed /
            pageNumbers.length) *
            76
        );

      onProgress(
        Math.min(
          86,
          percentage
        )
      );
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(91);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams:
        true,
    });

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(100);
  }

  return {
    blob: new Blob(
      [pdfBytes],
      {
        type:
          "application/pdf",
      }
    ),
    pageCount,
    watermarkedPages:
      pageNumbers.length,
    watermarkType:
      watermark.type,
  };
}