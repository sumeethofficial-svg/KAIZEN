import {
  PDFDocument,
  rgb,
  StandardFonts,
} from "pdf-lib";

/**
 * Load a PDF and return basic page information.
 */
export async function getSignPdfInfo(file) {
  if (!file) {
    throw new Error("No PDF file was provided.");
  }

  const fileBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(fileBuffer);

  return {
    pageCount: pdf.getPageCount(),
    pages: Array.from(
      { length: pdf.getPageCount() },
      (_, index) => {
        const page = pdf.getPage(index);

        return {
          pageNumber: index + 1,
          width: page.getWidth(),
          height: page.getHeight(),
          rotation: page.getRotation().angle,
        };
      }
    ),
  };
}

/**
 * Validate normalized page coordinates.
 *
 * Coordinates are based on the visual editor:
 * x/y = 0..1
 * origin = top-left
 */
function validateRect(rect) {
  if (!rect || typeof rect !== "object") {
    throw new Error("Invalid signature position.");
  }

  const x = Number(rect.x);
  const y = Number(rect.y);
  const width = Number(rect.width);
  const height = Number(rect.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new Error(
      "Signature position contains invalid coordinates."
    );
  }

  if (
    x < 0 ||
    y < 0 ||
    width <= 0 ||
    height <= 0 ||
    x + width > 1.000001 ||
    y + height > 1.000001
  ) {
    throw new Error(
      "Signature must remain inside the PDF page."
    );
  }

  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Convert visual-editor normalized coordinates
 * to PDF bottom-left coordinates.
 */
function rectToPdfCoordinates(
  rect,
  pageWidth,
  pageHeight
) {
  const normalized = validateRect(rect);

  return {
    x: normalized.x * pageWidth,
    y:
      pageHeight -
      (normalized.y + normalized.height) *
        pageHeight,
    width:
      normalized.width * pageWidth,
    height:
      normalized.height * pageHeight,
  };
}

/**
 * Convert a simple RGB array into pdf-lib RGB values.
 *
 * Supports both:
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

  const values = color.map(Number);

  if (
    values.some(
      (value) => !Number.isFinite(value)
    )
  ) {
    return fallback;
  }

  const divisor = values.some(
    (value) => value > 1
  )
    ? 255
    : 1;

  return values.map((value) =>
    Math.max(
      0,
      Math.min(1, value / divisor)
    )
  );
}

/**
 * Load an image embedded in a signature.
 *
 * The UI can provide a PNG/JPEG File or Blob.
 */
async function embedSignatureImage(
  pdf,
  image
) {
  if (!image) {
    throw new Error(
      "No signature image was provided."
    );
  }

  let bytes;

  if (
    image instanceof Blob ||
    image instanceof File
  ) {
    bytes = await image.arrayBuffer();
  } else if (
    image instanceof ArrayBuffer
  ) {
    bytes = image;
  } else if (
    ArrayBuffer.isView(image)
  ) {
    bytes = image.buffer;
  } else if (
    typeof image === "string"
  ) {
    throw new Error(
      "Signature image must be provided as a File, Blob, or ArrayBuffer."
    );
  } else {
    throw new Error(
      "Unsupported signature image format."
    );
  }

  const type =
    image?.type?.toLowerCase?.() || "";

  if (
    type.includes("jpeg") ||
    type.includes("jpg")
  ) {
    return pdf.embedJpg(bytes);
  }

  if (type.includes("png")) {
    return pdf.embedPng(bytes);
  }

  /**
   * When MIME type isn't available,
   * inspect the file signature.
   */
  const byteView =
    new Uint8Array(bytes);

  const isPng =
    byteView.length >= 8 &&
    byteView[0] === 0x89 &&
    byteView[1] === 0x50 &&
    byteView[2] === 0x4e &&
    byteView[3] === 0x47 &&
    byteView[4] === 0x0d &&
    byteView[5] === 0x0a &&
    byteView[6] === 0x1a &&
    byteView[7] === 0x0a;

  const isJpeg =
    byteView.length >= 2 &&
    byteView[0] === 0xff &&
    byteView[1] === 0xd8;

  if (isPng) {
    return pdf.embedPng(bytes);
  }

  if (isJpeg) {
    return pdf.embedJpg(bytes);
  }

  throw new Error(
    "The signature image must be PNG or JPEG."
  );
}

/**
 * Draw a typed signature.
 *
 * This is intentionally rendered as a signature
 * appearance rather than pretending to create a
 * cryptographic certificate-based digital signature.
 */
async function drawTypedSignature(
  page,
  signature
) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const rect =
    rectToPdfCoordinates(
      signature,
      pageWidth,
      pageHeight
    );

  const text = String(
    signature.text ?? ""
  ).trim();

  if (!text) {
    throw new Error(
      "Typed signature cannot be empty."
    );
  }

  const fontName =
    signature.font === "times"
      ? StandardFonts.TimesItalic
      : StandardFonts.HelveticaOblique;

  const font =
    await page.doc.embedFont(
      fontName
    );

  const color =
    normalizeColor(
      signature.color,
      [0, 0, 0]
    );

  const padding = Math.max(
    3,
    Number(signature.padding ?? 6)
  );

  const requestedSize = Number(
    signature.fontSize ?? 28
  );

  const fontSize =
    Number.isFinite(requestedSize) &&
    requestedSize > 0
      ? requestedSize
      : 28;

  const availableWidth =
    Math.max(
      1,
      rect.width - padding * 2
    );

  const textWidth =
    font.widthOfTextAtSize(
      text,
      fontSize
    );

  let finalFontSize = fontSize;

  if (textWidth > availableWidth) {
    finalFontSize =
      fontSize *
      (availableWidth / textWidth);
  }

  finalFontSize = Math.max(
    7,
    finalFontSize
  );

  const finalTextWidth =
    font.widthOfTextAtSize(
      text,
      finalFontSize
    );

  const textHeight =
    font.heightAtSize(
      finalFontSize
    );

  const alignment =
    signature.alignment || "center";

  let textX =
    rect.x + padding;

  if (alignment === "center") {
    textX =
      rect.x +
      (rect.width -
        finalTextWidth) /
        2;
  }

  if (alignment === "right") {
    textX =
      rect.x +
      rect.width -
      finalTextWidth -
      padding;
  }

  const textY =
    rect.y +
    (rect.height -
      textHeight) /
      2;

  if (signature.showLine !== false) {
    page.drawLine({
      start: {
        x: rect.x,
        y:
          rect.y +
          Math.max(
            2,
            rect.height * 0.12
          ),
      },
      end: {
        x:
          rect.x +
          rect.width,
        y:
          rect.y +
          Math.max(
            2,
            rect.height * 0.12
          ),
      },
      thickness: 1,
      color: rgb(
        color[0],
        color[1],
        color[2]
      ),
    });
  }

  page.drawText(text, {
    x: textX,
    y: textY,
    size: finalFontSize,
    font,
    color: rgb(
      color[0],
      color[1],
      color[2]
    ),
  });
}

/**
 * Draw an image signature.
 */
async function drawImageSignature(
  page,
  pdf,
  signature
) {
  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  const rect =
    rectToPdfCoordinates(
      signature,
      pageWidth,
      pageHeight
    );

  const image =
    await embedSignatureImage(
      pdf,
      signature.image
    );

  const imageWidth =
    Number(image.width) || 1;

  const imageHeight =
    Number(image.height) || 1;

  const scale =
    Math.min(
      rect.width / imageWidth,
      rect.height / imageHeight
    );

  const drawWidth =
    imageWidth * scale;

  const drawHeight =
    imageHeight * scale;

  const x =
    rect.x +
    (rect.width -
      drawWidth) /
      2;

  const y =
    rect.y +
    (rect.height -
      drawHeight) /
      2;

  page.drawImage(image, {
    x,
    y,
    width: drawWidth,
    height: drawHeight,
  });
}

/**
 * Create a signature configuration object
 * for a typed signature.
 */
export function createTypedSignature(
  pageNumber,
  rect,
  text,
  options = {}
) {
  return {
    type: "typed",
    pageNumber,
    ...rect,
    text,
    font:
      options.font ?? "script",
    fontSize:
      options.fontSize ?? 28,
    color:
      options.color ?? [
        0,
        0,
        0,
      ],
    alignment:
      options.alignment ?? "center",
    showLine:
      options.showLine ?? false,
    padding:
      options.padding ?? 6,
  };
}

/**
 * Create a signature configuration object
 * for an uploaded/drawn image.
 */
export function createImageSignature(
  pageNumber,
  rect,
  image
) {
  return {
    type: "image",
    pageNumber,
    ...rect,
    image,
  };
}

/**
 * Apply one or more signatures to a PDF.
 *
 * Signature objects:
 *
 * {
 *   type: "typed",
 *   pageNumber: 1,
 *   x: 0.2,
 *   y: 0.7,
 *   width: 0.4,
 *   height: 0.1,
 *   text: "Sumeeth",
 *   font: "script",
 *   fontSize: 28
 * }
 *
 * {
 *   type: "image",
 *   pageNumber: 1,
 *   x: 0.2,
 *   y: 0.7,
 *   width: 0.4,
 *   height: 0.1,
 *   image: File
 * }
 */
export async function signPdf(
  file,
  signatures = [],
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  if (
    !Array.isArray(signatures) ||
    signatures.length === 0
  ) {
    throw new Error(
      "Please add at least one signature."
    );
  }

  const fileBuffer =
    await file.arrayBuffer();

  if (
    typeof onProgress === "function"
  ) {
    onProgress(5);
  }

  const pdf =
    await PDFDocument.load(
      fileBuffer
    );

  const pageCount =
    pdf.getPageCount();

  if (pageCount < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  for (const signature of signatures) {
    const pageNumber = Number(
      signature?.pageNumber
    );

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pageCount
    ) {
      throw new Error(
        `Signature references invalid page ${signature?.pageNumber}.`
      );
    }

    if (
      signature?.type !== "typed" &&
      signature?.type !== "image"
    ) {
      throw new Error(
        `Unsupported signature type "${signature?.type}".`
      );
    }

    validateRect(signature);
  }

  if (
    typeof onProgress === "function"
  ) {
    onProgress(15);
  }

  let processed = 0;

  for (const signature of signatures) {
    const page =
      pdf.getPage(
        Number(signature.pageNumber) -
          1
      );

    if (signature.type === "typed") {
      await drawTypedSignature(
        page,
        signature
      );
    }

    if (signature.type === "image") {
      await drawImageSignature(
        page,
        pdf,
        signature
      );
    }

    processed += 1;

    if (
      typeof onProgress === "function"
    ) {
      const percentage =
        15 +
        Math.round(
          (processed /
            signatures.length) *
            75
        );

      onProgress(
        Math.min(
          90,
          percentage
        )
      );
    }
  }

  if (
    typeof onProgress === "function"
  ) {
    onProgress(94);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
    });

  if (
    typeof onProgress === "function"
  ) {
    onProgress(100);
  }

  return {
    blob: new Blob(
      [pdfBytes],
      {
        type: "application/pdf",
      }
    ),
    pageCount,
    signatureCount:
      signatures.length,
  };
}