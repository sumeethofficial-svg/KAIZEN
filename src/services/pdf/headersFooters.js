import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function getHeadersFootersPdfInfo(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  return {
    fileName: file.name,
    pageCount: pdfDoc.getPageCount(),
    size: file.size,
  };
}

export function createHeadersFootersOptions(options = {}) {
  return {
    header: {
      enabled: Boolean(options.header?.enabled),
      left: String(options.header?.left ?? ""),
      center: String(options.header?.center ?? ""),
      right: String(options.header?.right ?? ""),
    },

    footer: {
      enabled: Boolean(options.footer?.enabled),
      left: String(options.footer?.left ?? ""),
      center: String(options.footer?.center ?? ""),
      right: String(options.footer?.right ?? ""),
    },

    font: options.font || "Helvetica",
    fontSize: Number(options.fontSize) || 9,

    opacity:
      typeof options.opacity === "number"
        ? Math.max(0, Math.min(1, options.opacity))
        : 1,

    marginTop:
      typeof options.marginTop === "number"
        ? Math.max(0, options.marginTop)
        : 24,

    marginBottom:
      typeof options.marginBottom === "number"
        ? Math.max(0, options.marginBottom)
        : 24,

    marginLeft:
      typeof options.marginLeft === "number"
        ? Math.max(0, options.marginLeft)
        : 24,

    marginRight:
      typeof options.marginRight === "number"
        ? Math.max(0, options.marginRight)
        : 24,

    lineEnabled: Boolean(options.lineEnabled),

    lineWidth:
      typeof options.lineWidth === "number"
        ? Math.max(0.1, options.lineWidth)
        : 0.6,

    lineGap:
      typeof options.lineGap === "number"
        ? Math.max(0, options.lineGap)
        : 6,

    pageSelection: options.pageSelection || "all",

    customPages: Array.isArray(options.customPages)
      ? options.customPages
          .map((page) => Number(page))
          .filter(
            (page) => Number.isInteger(page) && page > 0
          )
      : [],
  };
}

function resolveTemplate(text, context) {
  if (!text) {
    return "";
  }

  return text
    .replace(/\{\{page\}\}/gi, String(context.page))
    .replace(/\{\{pages\}\}/gi, String(context.pages))
    .replace(/\{\{filename\}\}/gi, context.filename)
    .replace(/\{\{date\}\}/gi, context.date)
    .replace(/\{\{time\}\}/gi, context.time);
}

function getFontName(fontName) {
  switch (fontName) {
    case "Times-Roman":
      return StandardFonts.TimesRoman;

    case "Times-Bold":
      return StandardFonts.TimesRomanBold;

    case "Times-Italic":
      return StandardFonts.TimesRomanItalic;

    case "Courier":
      return StandardFonts.Courier;

    case "Courier-Bold":
      return StandardFonts.CourierBold;

    case "Courier-Oblique":
      return StandardFonts.CourierOblique;

    case "Helvetica-Bold":
      return StandardFonts.HelveticaBold;

    case "Helvetica-Oblique":
      return StandardFonts.HelveticaOblique;

    case "Helvetica":
    default:
      return StandardFonts.Helvetica;
  }
}

function shouldProcessPage(pageNumber, totalPages, options) {
  switch (options.pageSelection) {
    case "first":
      return pageNumber === 1;

    case "last":
      return pageNumber === totalPages;

    case "odd":
      return pageNumber % 2 === 1;

    case "even":
      return pageNumber % 2 === 0;

    case "custom":
      return options.customPages.includes(pageNumber);

    case "all":
    default:
      return true;
  }
}

function drawAlignedText({
  page,
  text,
  x,
  y,
  alignment,
  font,
  fontSize,
  opacity,
}) {
  if (!text) {
    return;
  }

  const textWidth = font.widthOfTextAtSize(text, fontSize);

  let drawX = x;

  if (alignment === "center") {
    drawX = x - textWidth / 2;
  }

  if (alignment === "right") {
    drawX = x - textWidth;
  }

  page.drawText(text, {
    x: drawX,
    y,
    size: fontSize,
    font,
    color: rgb(0, 0, 0),
    opacity,
  });
}

/**
 * Add headers and footers to the supplied PDF.
 */
export async function addHeadersFooters(
  file,
  options = {},
  onProgress
) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }

  const arrayBuffer = await file.arrayBuffer();

  const pdfDoc = await PDFDocument.load(arrayBuffer);

  const normalizedOptions =
    createHeadersFootersOptions(options);

  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  if (totalPages === 0) {
    throw new Error("The PDF contains no pages.");
  }

  const font = await pdfDoc.embedFont(
    getFontName(normalizedOptions.font)
  );

  const now = new Date();

  const templateDate = now.toLocaleDateString();
  const templateTime = now.toLocaleTimeString();

  const filename = file.name.replace(/\.pdf$/i, "");

  for (let index = 0; index < pages.length; index += 1) {
    const pageNumber = index + 1;
    const page = pages[index];

    const progressPercent = Math.round(
      (pageNumber / totalPages) * 100
    );

    if (
      shouldProcessPage(
        pageNumber,
        totalPages,
        normalizedOptions
      )
    ) {
      const { width, height } = page.getSize();

      const leftX = normalizedOptions.marginLeft;
      const centerX = width / 2;
      const rightX =
        width - normalizedOptions.marginRight;

      const headerY =
        height -
        normalizedOptions.marginTop -
        normalizedOptions.fontSize;

      const footerY =
        normalizedOptions.marginBottom;

      const context = {
        page: pageNumber,
        pages: totalPages,
        filename,
        date: templateDate,
        time: templateTime,
      };

      if (normalizedOptions.header.enabled) {
        const headerLeft = resolveTemplate(
          normalizedOptions.header.left,
          context
        );

        const headerCenter = resolveTemplate(
          normalizedOptions.header.center,
          context
        );

        const headerRight = resolveTemplate(
          normalizedOptions.header.right,
          context
        );

        drawAlignedText({
          page,
          text: headerLeft,
          x: leftX,
          y: headerY,
          alignment: "left",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        drawAlignedText({
          page,
          text: headerCenter,
          x: centerX,
          y: headerY,
          alignment: "center",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        drawAlignedText({
          page,
          text: headerRight,
          x: rightX,
          y: headerY,
          alignment: "right",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        if (normalizedOptions.lineEnabled) {
          const lineY =
            headerY - normalizedOptions.lineGap;

          page.drawLine({
            start: {
              x: leftX,
              y: lineY,
            },
            end: {
              x: rightX,
              y: lineY,
            },
            thickness: normalizedOptions.lineWidth,
            color: rgb(0, 0, 0),
            opacity: normalizedOptions.opacity,
          });
        }
      }

      if (normalizedOptions.footer.enabled) {
        const footerLeft = resolveTemplate(
          normalizedOptions.footer.left,
          context
        );

        const footerCenter = resolveTemplate(
          normalizedOptions.footer.center,
          context
        );

        const footerRight = resolveTemplate(
          normalizedOptions.footer.right,
          context
        );

        drawAlignedText({
          page,
          text: footerLeft,
          x: leftX,
          y: footerY,
          alignment: "left",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        drawAlignedText({
          page,
          text: footerCenter,
          x: centerX,
          y: footerY,
          alignment: "center",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        drawAlignedText({
          page,
          text: footerRight,
          x: rightX,
          y: footerY,
          alignment: "right",
          font,
          fontSize: normalizedOptions.fontSize,
          opacity: normalizedOptions.opacity,
        });

        if (normalizedOptions.lineEnabled) {
          const lineY =
            footerY +
            normalizedOptions.fontSize +
            normalizedOptions.lineGap;

          page.drawLine({
            start: {
              x: leftX,
              y: lineY,
            },
            end: {
              x: rightX,
              y: lineY,
            },
            thickness: normalizedOptions.lineWidth,
            color: rgb(0, 0, 0),
            opacity: normalizedOptions.opacity,
          });
        }
      }
    }

    onProgress?.({
      current: pageNumber,
      total: totalPages,
      percent: progressPercent,
    });
  }

  const outputBytes = await pdfDoc.save();

  return new Blob([outputBytes], {
    type: "application/pdf",
  });
}