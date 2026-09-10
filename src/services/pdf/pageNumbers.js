import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

/**
 * Load a PDF and return basic page information.
 */
export async function getPageNumbersPdfInfo(file) {
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
          pageNumber:
            index + 1,
          width:
            page.getWidth(),
          height:
            page.getHeight(),
          rotation:
            page
              .getRotation()
              .angle,
        };
      }
    ),
  };
}

/**
 * Clamp a number.
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
 * Convert normalized coordinates
 * from the UI to PDF coordinates.
 *
 * x/y = 0..1
 * origin = top-left
 */
function normalizedPositionToPdf(
  position,
  pageWidth,
  pageHeight
) {
  const x = Number(
    position?.x
  );

  const y = Number(
    position?.y
  );

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new Error(
      "Page-number position contains invalid coordinates."
    );
  }

  if (
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    throw new Error(
      "Page-number position must remain inside the page."
    );
  }

  return {
    x:
      x * pageWidth,

    y:
      pageHeight -
      y * pageHeight,
  };
}

/**
 * Normalize RGB color.
 *
 * Supports:
 * [0, 0, 0]
 * [255, 255, 255]
 */
function normalizeColor(
  color,
  fallback = [
    0,
    0,
    0,
  ]
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
        !Number.isFinite(
          value
        )
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
 * Resolve which pages should receive
 * page numbers.
 *
 * Supported:
 * "all"
 * "odd"
 * "even"
 * "custom" + array
 */
function resolvePageNumbers(
  selection,
  pageCount,
  customPages
) {
  if (
    selection ===
      undefined ||
    selection ===
      null ||
    selection ===
      "all"
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
    selection ===
    "odd"
  ) {
    return Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        index + 1
    ).filter(
      (page) =>
        page % 2 === 1
    );
  }

  if (
    selection ===
    "even"
  ) {
    return Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        index + 1
    ).filter(
      (page) =>
        page % 2 === 0
    );
  }

  if (
    selection ===
    "custom"
  ) {
    if (
      !Array.isArray(
        customPages
      )
    ) {
      throw new Error(
        "Custom page selection requires a page-number array."
      );
    }

    const validPages =
      customPages
        .map(Number)
        .filter(
          (page) =>
            Number.isInteger(
              page
            ) &&
            page >= 1 &&
            page <=
              pageCount
        );

    const uniquePages =
      [
        ...new Set(
          validPages
        ),
      ];

    if (
      uniquePages.length ===
      0
    ) {
      throw new Error(
        "No valid custom pages were selected."
      );
    }

    return uniquePages;
  }

  throw new Error(
    "Invalid page selection."
  );
}

/**
 * Determine the page-number text.
 *
 * Supported formats:
 *
 * "number"
 * "page-of-total"
 * "page-total"
 */
function formatPageNumber(
  pageNumber,
  pageCount,
  format
) {
  switch (format) {
    case "page-of-total":
      return `${pageNumber} of ${pageCount}`;

    case "page-total":
      return `${pageNumber}/${pageCount}`;

    case "number":
    default:
      return `${pageNumber}`;
  }
}

/**
 * Resolve numbering start.
 *
 * Example:
 * startNumber = 1
 * document numbering:
 * 1, 2, 3...
 *
 * startNumber = 5
 * document numbering:
 * 5, 6, 7...
 */
function resolveNumber(
  pageNumber,
  startNumber
) {
  return (
    Number(startNumber) +
    pageNumber -
    1
  );
}

/**
 * Create a page-number configuration.
 */
export function createPageNumberOptions(
  options = {}
) {
  return {
    position:
      options.position ??
      "bottom-center",

    format:
      options.format ??
      "number",

    startNumber:
      options.startNumber ??
      1,

    font:
      options.font ??
      "helvetica",

    fontSize:
      options.fontSize ??
      11,

    color:
      options.color ??
      [
        80,
        80,
        80,
      ],

    margin:
      options.margin ??
      28,

    opacity:
      options.opacity ??
      1,

    pageSelection:
      options.pageSelection ??
      "all",

    customPages:
      options.customPages ??
      [],
  };
}

/**
 * Calculate the page-number coordinates.
 *
 * Position names:
 *
 * top-left
 * top-center
 * top-right
 * middle-left
 * center
 * middle-right
 * bottom-left
 * bottom-center
 * bottom-right
 */
function calculatePosition(
  position,
  pageWidth,
  pageHeight,
  textWidth,
  textHeight,
  margin
) {
  const safeMargin =
    Math.max(
      4,
      Number(margin) || 28
    );

  const positions = {
    "top-left": {
      x:
        safeMargin,

      y:
        pageHeight -
        safeMargin -
        textHeight,
    },

    "top-center": {
      x:
        (pageWidth -
          textWidth) /
        2,

      y:
        pageHeight -
        safeMargin -
        textHeight,
    },

    "top-right": {
      x:
        pageWidth -
        safeMargin -
        textWidth,

      y:
        pageHeight -
        safeMargin -
        textHeight,
    },

    "middle-left": {
      x:
        safeMargin,

      y:
        (pageHeight -
          textHeight) /
        2,
    },

    center: {
      x:
        (pageWidth -
          textWidth) /
        2,

      y:
        (pageHeight -
          textHeight) /
        2,
    },

    "middle-right": {
      x:
        pageWidth -
        safeMargin -
        textWidth,

      y:
        (pageHeight -
          textHeight) /
        2,
    },

    "bottom-left": {
      x:
        safeMargin,

      y:
        safeMargin,
    },

    "bottom-center": {
      x:
        (pageWidth -
          textWidth) /
        2,

      y:
        safeMargin,
    },

    "bottom-right": {
      x:
        pageWidth -
        safeMargin -
        textWidth,

      y:
        safeMargin,
    },
  };

  return (
    positions[position] ||
    positions[
      "bottom-center"
    ]
  );
}

/**
 * Add page numbers to a PDF.
 *
 * The numbering is drawn directly into
 * the existing PDF pages.
 */
export async function addPageNumbers(
  file,
  options = {},
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
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

  const config =
    createPageNumberOptions(
      options
    );

  const selectedPages =
    resolvePageNumbers(
      config.pageSelection,
      pageCount,
      config.customPages
    );

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(10);
  }

  let fontName =
    StandardFonts.Helvetica;

  if (
    config.font ===
    "times"
  ) {
    fontName =
      StandardFonts.TimesRoman;
  }

  if (
    config.font ===
    "courier"
  ) {
    fontName =
      StandardFonts.Courier;
  }

  if (
    config.font ===
    "helvetica-bold"
  ) {
    fontName =
      StandardFonts.HelveticaBold;
  }

  if (
    config.font ===
    "times-bold"
  ) {
    fontName =
      StandardFonts.TimesRomanBold;
  }

  const font =
    await pdf.embedFont(
      fontName
    );

  const color =
    normalizeColor(
      config.color,
      [
        80,
        80,
        80,
      ]
    );

  const opacity =
    clamp(
      Number(
        config.opacity
      ),
      0,
      1
    );

  const fontSizeValue =
    Number(
      config.fontSize
    );

  const fontSize =
    Number.isFinite(
      fontSizeValue
    ) &&
    fontSizeValue > 0
      ? Math.max(
          4,
          Math.min(
            96,
            fontSizeValue
          )
        )
      : 11;

  const startNumberValue =
    Number(
      config.startNumber
    );

  const startNumber =
    Number.isFinite(
      startNumberValue
    )
      ? Math.max(
          1,
          Math.floor(
            startNumberValue
          )
        )
      : 1;

  let processed =
    0;

  for (
    const pageNumber of
      selectedPages
  ) {
    const page =
      pdf.getPage(
        pageNumber - 1
      );

    const text =
      formatPageNumber(
        resolveNumber(
          pageNumber,
          startNumber
        ),
        resolveNumber(
          pageCount,
          startNumber
        ),
        config.format
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

    const position =
      calculatePosition(
        config.position,
        page.getWidth(),
        page.getHeight(),
        textWidth,
        textHeight,
        config.margin
      );

    page.drawText(
      text,
      {
        x:
          position.x,

        y:
          position.y,

        size:
          fontSize,

        font,

        color:
          rgb(
            color[0],
            color[1],
            color[2]
          ),

        opacity,

        lineHeight:
          textHeight,
      }
    );

    processed += 1;

    if (
      typeof onProgress ===
      "function"
    ) {
      const percentage =
        10 +
        Math.round(
          (processed /
            selectedPages.length) *
            78
        );

      onProgress(
        Math.min(
          88,
          percentage
        )
      );
    }
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(93);
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

    numberedPages:
      selectedPages.length,

    startNumber,

    format:
      config.format,

    position:
      config.position,
  };
}