import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

/**
 * Load a PDF and return basic page information.
 */
export async function getBatesPdfInfo(file) {
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
      {
        length:
          pdf.getPageCount(),
      },
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
 * Resolve selected pages.
 *
 * Supported:
 * "all"
 * "odd"
 * "even"
 * "custom"
 */
function resolvePages(
  selection,
  pageCount,
  customPages
) {
  const allPages =
    Array.from(
      {
        length:
          pageCount,
      },
      (_, index) =>
        index + 1
    );

  if (
    !selection ||
    selection ===
      "all"
  ) {
    return allPages;
  }

  if (
    selection ===
    "odd"
  ) {
    return allPages.filter(
      (page) =>
        page % 2 === 1
    );
  }

  if (
    selection ===
    "even"
  ) {
    return allPages.filter(
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
        "Custom Bates pages require an array of page numbers."
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
      ].sort(
        (a, b) =>
          a - b
      );

    if (
      uniquePages.length ===
      0
    ) {
      throw new Error(
        "No valid custom Bates pages were selected."
      );
    }

    return uniquePages;
  }

  throw new Error(
    "Invalid Bates page selection."
  );
}

/**
 * Convert a number to a zero-padded string.
 *
 * Example:
 * number = 27
 * digits = 6
 * => "000027"
 */
function padNumber(
  number,
  digits
) {
  return String(
    number
  ).padStart(
    digits,
    "0"
  );
}

/**
 * Create the Bates identifier.
 *
 * Example:
 *
 * prefix = "CASE-"
 * start = 1
 * digits = 6
 *
 * => CASE-000001
 */
function createBatesIdentifier(
  number,
  options
) {
  const prefix =
    String(
      options.prefix ??
        ""
    );

  const suffix =
    String(
      options.suffix ??
        ""
    );

  const digitsValue =
    Number(
      options.digits ??
        6
    );

  const digits =
    Number.isFinite(
      digitsValue
    )
      ? Math.max(
          1,
          Math.min(
            20,
            Math.floor(
              digitsValue
            )
          )
        )
      : 6;

  return (
    prefix +
    padNumber(
      number,
      digits
    ) +
    suffix
  );
}

/**
 * Position the Bates number.
 *
 * Supported:
 *
 * top-left
 * top-center
 * top-right
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
      Number(
        margin
      ) || 28
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
    positions[
      position
    ] ||
    positions[
      "bottom-right"
    ]
  );
}

/**
 * Create a Bates configuration.
 */
export function createBatesOptions(
  options = {}
) {
  return {
    prefix:
      options.prefix ??
      "",

    suffix:
      options.suffix ??
      "",

    startNumber:
      options.startNumber ??
      1,

    digits:
      options.digits ??
      6,

    position:
      options.position ??
      "bottom-right",

    font:
      options.font ??
      "helvetica",

    fontSize:
      options.fontSize ??
      10,

    color:
      options.color ??
      [
        70,
        70,
        70,
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
 * Add Bates numbers to a PDF.
 *
 * Bates numbering is sequential across the
 * selected pages rather than restarting at
 * each page.
 */
export async function addBatesNumbers(
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
    createBatesOptions(
      options
    );

  const selectedPages =
    resolvePages(
      config.pageSelection,
      pageCount,
      config.customPages
    );

  if (
    selectedPages.length ===
    0
  ) {
    throw new Error(
      "No pages were selected for Bates numbering."
    );
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(10);
  }

  const fontName =
    config.font ===
    "times"
      ? StandardFonts.TimesRoman
      : config.font ===
        "times-bold"
      ? StandardFonts.TimesRomanBold
      : config.font ===
        "courier"
      ? StandardFonts.Courier
      : config.font ===
        "courier-bold"
      ? StandardFonts.CourierBold
      : config.font ===
        "helvetica-bold"
      ? StandardFonts.HelveticaBold
      : StandardFonts.Helvetica;

  const font =
    await pdf.embedFont(
      fontName
    );

  const color =
    normalizeColor(
      config.color,
      [
        70,
        70,
        70,
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
    fontSizeValue >
      0
      ? clamp(
          fontSizeValue,
          4,
          96
        )
      : 10;

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

  const digitsValue =
    Number(
      config.digits
    );

  const digits =
    Number.isFinite(
      digitsValue
    )
      ? clamp(
          Math.floor(
            digitsValue
          ),
          1,
          20
        )
      : 6;

  let processed =
    0;

  for (
    let index = 0;
    index <
    selectedPages.length;
    index += 1
  ) {
    const pageNumber =
      selectedPages[index];

    const page =
      pdf.getPage(
        pageNumber - 1
      );

    const batesNumber =
      startNumber +
      index;

    const identifier =
      createBatesIdentifier(
        batesNumber,
        {
          ...config,
          digits,
        }
      );

    const textWidth =
      font.widthOfTextAtSize(
        identifier,
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
      identifier,
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

    digits,

    prefix:
      config.prefix,

    suffix:
      config.suffix,

    position:
      config.position,
  };
}