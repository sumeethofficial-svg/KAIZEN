import {
  PDFDocument,
  StandardFonts,
  rgb,
} from "pdf-lib";

/**
 * Get basic information about a PDF.
 */
export async function getPdfInfo(file) {
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
 * Validate one edit object.
 */
function validateEdit(edit, pageCount) {
  if (!edit || typeof edit !== "object") {
    throw new Error("Invalid edit data.");
  }

  const pageNumber = Number(edit.pageNumber);

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > pageCount
  ) {
    throw new Error(
      `Edit references invalid page ${edit.pageNumber}.`
    );
  }

  if (
    edit.type !== "text" &&
    edit.type !== "rectangle" &&
    edit.type !== "line"
  ) {
    throw new Error(
      `Unsupported edit type "${edit.type}".`
    );
  }

  return {
    ...edit,
    pageNumber,
  };
}

/**
 * Convert normalized top-left UI coordinates
 * into PDF bottom-left coordinates.
 *
 * x, y, width, height are all normalized 0..1.
 */
function normalizeRect(
  rect,
  pageWidth,
  pageHeight
) {
  const x = Number(rect?.x);
  const y = Number(rect?.y);
  const width = Number(rect?.width);
  const height = Number(rect?.height);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    throw new Error(
      "Edit position or size contains invalid values."
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
      "Edit must remain inside the PDF page."
    );
  }

  return {
    x: x * pageWidth,
    y:
      pageHeight -
      (y + height) * pageHeight,
    width: width * pageWidth,
    height: height * pageHeight,
  };
}

/**
 * Convert a normalized point from the visual editor
 * into PDF coordinates.
 */
function normalizePoint(
  point,
  pageWidth,
  pageHeight
) {
  const x = Number(point?.x);
  const y = Number(point?.y);

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new Error(
      "Edit point contains invalid coordinates."
    );
  }

  if (
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    throw new Error(
      "Edit point must remain inside the PDF page."
    );
  }

  return {
    x: x * pageWidth,
    y: pageHeight - y * pageHeight,
  };
}

/**
 * Draw a text edit.
 */
async function drawTextEdit(
  page,
  edit
) {
  const pageWidth =
    page.getWidth();

  const pageHeight =
    page.getHeight();

  const rect =
    normalizeRect(
      edit,
      pageWidth,
      pageHeight
    );

  const text =
    String(edit.text ?? "");

  if (!text.trim()) {
    throw new Error(
      "Text edits cannot be empty."
    );
  }

  const fontSize =
    Number(edit.fontSize ?? 16);

  if (
    !Number.isFinite(fontSize) ||
    fontSize <= 0
  ) {
    throw new Error(
      "Text size must be greater than zero."
    );
  }

  const font =
    await page.doc.embedFont(
      StandardFonts.Helvetica
    );

  const color =
    normalizeColor(
      edit.color,
      [0, 0, 0]
    );

  const backgroundColor =
    edit.background
      ? normalizeColor(
          edit.background,
          [1, 1, 1]
        )
      : null;

  const padding =
    Number(edit.padding ?? 4);

  if (
    !Number.isFinite(padding) ||
    padding < 0
  ) {
    throw new Error(
      "Text padding must be zero or greater."
    );
  }

  if (backgroundColor) {
    page.drawRectangle({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      color: rgb(
        backgroundColor[0],
        backgroundColor[1],
        backgroundColor[2]
      ),
    });
  }

  page.drawText(
    text,
    {
      x: rect.x + padding,
      y:
        rect.y +
        rect.height -
        fontSize -
        padding,
      size: fontSize,
      font,
      color: rgb(
        color[0],
        color[1],
        color[2]
      ),
      maxWidth:
        Math.max(
          1,
          rect.width -
            padding * 2
        ),
      lineHeight:
        fontSize * 1.25,
    }
  );
}

/**
 * Draw a rectangle edit.
 */
function drawRectangleEdit(
  page,
  edit
) {
  const rect =
    normalizeRect(
      edit,
      page.getWidth(),
      page.getHeight()
    );

  const fill =
    edit.fill
      ? normalizeColor(
          edit.fill,
          [1, 1, 1]
        )
      : null;

  const border =
    normalizeColor(
      edit.border,
      [0, 0, 0]
    );

  const borderWidth =
    Number(
      edit.borderWidth ?? 1
    );

  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    color: fill
      ? rgb(
          fill[0],
          fill[1],
          fill[2]
        )
      : undefined,
    borderColor: rgb(
      border[0],
      border[1],
      border[2]
    ),
    borderWidth:
      Number.isFinite(
        borderWidth
      ) && borderWidth >= 0
        ? borderWidth
        : 1,
  });
}

/**
 * Draw a line edit.
 */
function drawLineEdit(
  page,
  edit
) {
  const start =
    normalizePoint(
      edit.start,
      page.getWidth(),
      page.getHeight()
    );

  const end =
    normalizePoint(
      edit.end,
      page.getWidth(),
      page.getHeight()
    );

  const color =
    normalizeColor(
      edit.color,
      [0, 0, 0]
    );

  const thickness =
    Number(
      edit.thickness ?? 1
    );

  page.drawLine({
    start,
    end,
    color: rgb(
      color[0],
      color[1],
      color[2]
    ),
    thickness:
      Number.isFinite(
        thickness
      ) && thickness > 0
        ? thickness
        : 1,
  });
}

/**
 * Normalize RGB color values.
 *
 * Supports:
 * [0, 0, 0]
 * [255, 255, 255]
 */
function normalizeColor(
  color,
  fallback
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
      (value) => value > 1
    )
      ? 255
      : 1;

  return values.map(
    (value) =>
      Math.max(
        0,
        Math.min(
          1,
          value / divisor
        )
      )
  );
}

/**
 * Apply overlay edits to a PDF.
 *
 * Supported edit types:
 *
 * {
 *   type: "text",
 *   pageNumber: 1,
 *   x: 0.1,
 *   y: 0.1,
 *   width: 0.4,
 *   height: 0.08,
 *   text: "Hello",
 *   fontSize: 16,
 *   color: [0, 0, 0],
 *   background: [1, 1, 1]
 * }
 *
 * {
 *   type: "rectangle",
 *   pageNumber: 1,
 *   x: 0.2,
 *   y: 0.2,
 *   width: 0.3,
 *   height: 0.2,
 *   fill: [255, 255, 255],
 *   border: [0, 0, 0]
 * }
 *
 * {
 *   type: "line",
 *   pageNumber: 1,
 *   start: { x: 0.1, y: 0.1 },
 *   end: { x: 0.8, y: 0.1 }
 * }
 */
export async function editPdf(
  file,
  edits = [],
  onProgress
) {
  if (!file) {
    throw new Error(
      "No PDF file was provided."
    );
  }

  if (
    !Array.isArray(edits) ||
    edits.length === 0
  ) {
    throw new Error(
      "Please add at least one edit."
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

  if (pageCount < 1) {
    throw new Error(
      "The PDF does not contain any pages."
    );
  }

  const normalizedEdits =
    edits.map((edit) =>
      validateEdit(
        edit,
        pageCount
      )
    );

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(15);
  }

  const editsByPage =
    new Map();

  normalizedEdits.forEach(
    (edit) => {
      if (
        !editsByPage.has(
          edit.pageNumber
        )
      ) {
        editsByPage.set(
          edit.pageNumber,
          []
        );
      }

      editsByPage
        .get(edit.pageNumber)
        .push(edit);
    }
  );

  let processedEdits = 0;

  for (
    const [
      pageNumber,
      pageEdits,
    ] of editsByPage
  ) {
    const page =
      pdf.getPage(
        pageNumber - 1
      );

    for (
      const edit of pageEdits
    ) {
      switch (edit.type) {
        case "text":
          await drawTextEdit(
            page,
            edit
          );
          break;

        case "rectangle":
          drawRectangleEdit(
            page,
            edit
          );
          break;

        case "line":
          drawLineEdit(
            page,
            edit
          );
          break;

        default:
          throw new Error(
            `Unsupported edit type "${edit.type}".`
          );
      }

      processedEdits += 1;

      if (
        typeof onProgress ===
        "function"
      ) {
        const percentage =
          15 +
          Math.round(
            (processedEdits /
              normalizedEdits.length) *
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
  }

  if (
    typeof onProgress ===
    "function"
  ) {
    onProgress(94);
  }

  const pdfBytes =
    await pdf.save({
      useObjectStreams: true,
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
        type: "application/pdf",
      }
    ),
    pageCount,
    editCount:
      normalizedEdits.length,
  };
}

/**
 * Create a simple text edit object.
 *
 * Useful for the visual editor UI.
 */
export function createTextEdit(
  pageNumber,
  rect,
  text,
  options = {}
) {
  return {
    type: "text",
    pageNumber,
    ...rect,
    text,
    fontSize:
      options.fontSize ?? 16,
    color:
      options.color ?? [
        0,
        0,
        0,
      ],
    background:
      options.background ??
      null,
    padding:
      options.padding ?? 4,
  };
}

/**
 * Create a rectangle edit object.
 */
export function createRectangleEdit(
  pageNumber,
  rect,
  options = {}
) {
  return {
    type: "rectangle",
    pageNumber,
    ...rect,
    fill:
      options.fill ?? null,
    border:
      options.border ?? [
        0,
        0,
        0,
      ],
    borderWidth:
      options.borderWidth ?? 1,
  };
}

/**
 * Create a line edit object.
 */
export function createLineEdit(
  pageNumber,
  start,
  end,
  options = {}
) {
  return {
    type: "line",
    pageNumber,
    start,
    end,
    color:
      options.color ?? [
        0,
        0,
        0,
      ],
    thickness:
      options.thickness ?? 1,
  };
}