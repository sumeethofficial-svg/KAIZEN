import { jsPDF } from "jspdf";

const PAGE_SIZES_MM = {
  A4: {
    portrait: {
      width: 210,
      height: 297,
    },
    landscape: {
      width: 297,
      height: 210,
    },
  },

  A3: {
    portrait: {
      width: 297,
      height: 420,
    },
    landscape: {
      width: 420,
      height: 297,
    },
  },

  Letter: {
    portrait: {
      width: 215.9,
      height: 279.4,
    },
    landscape: {
      width: 279.4,
      height: 215.9,
    },
  },

  Legal: {
    portrait: {
      width: 215.9,
      height: 355.6,
    },
    landscape: {
      width: 355.6,
      height: 215.9,
    },
  },
};

const FONT_FAMILIES = [
  "helvetica",
  "times",
  "courier",
];

const FONT_SIZES = [
  8,
  9,
  10,
  11,
  12,
  14,
  16,
  18,
  20,
  24,
  28,
  32,
];

function normalizePageSize(pageSize) {
  return PAGE_SIZES_MM[pageSize]
    ? pageSize
    : "A4";
}

function normalizeOrientation(orientation) {
  return orientation === "landscape"
    ? "landscape"
    : "portrait";
}

function normalizeMargin(margin) {
  return Math.min(
    30,
    Math.max(5, Number(margin) || 20),
  );
}

function normalizeFontSize(fontSize) {
  const parsed = Number(fontSize);

  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.min(
    32,
    Math.max(8, parsed),
  );
}

function normalizeLineSpacing(lineSpacing) {
  const parsed = Number(lineSpacing);

  if (!Number.isFinite(parsed)) {
    return 1.5;
  }

  return Math.min(
    2.5,
    Math.max(1, parsed),
  );
}

function normalizeFontFamily(fontFamily) {
  return FONT_FAMILIES.includes(fontFamily)
    ? fontFamily
    : "helvetica";
}

function normalizeAlignment(alignment) {
  if (
    alignment === "center" ||
    alignment === "right" ||
    alignment === "justify"
  ) {
    return alignment;
  }

  return "left";
}

function normalizeColor(color, fallback) {
  if (
    typeof color !== "string" ||
    !color.trim()
  ) {
    return fallback;
  }

  return color;
}

function createPdfDocument(
  pageSize,
  orientation,
) {
  const safePageSize =
    normalizePageSize(pageSize);

  const safeOrientation =
    normalizeOrientation(orientation);

  return new jsPDF({
    unit: "mm",
    format: safePageSize.toLowerCase(),
    orientation: safeOrientation,
    compress: true,
  });
}

function getPageDimensions(
  pageSize,
  orientation,
) {
  const safePageSize =
    normalizePageSize(pageSize);

  const safeOrientation =
    normalizeOrientation(orientation);

  return PAGE_SIZES_MM[
    safePageSize
  ][safeOrientation];
}

function hexToRgb(hex) {
  const normalized = hex
    .replace("#", "")
    .trim();

  if (normalized.length === 3) {
    return {
      r: parseInt(
        normalized[0] +
          normalized[0],
        16,
      ),
      g: parseInt(
        normalized[1] +
          normalized[1],
        16,
      ),
      b: parseInt(
        normalized[2] +
          normalized[2],
        16,
      ),
    };
  }

  if (normalized.length !== 6) {
    return {
      r: 0,
      g: 0,
      b: 0,
    };
  }

  return {
    r: parseInt(
      normalized.slice(0, 2),
      16,
    ),
    g: parseInt(
      normalized.slice(2, 4),
      16,
    ),
    b: parseInt(
      normalized.slice(4, 6),
      16,
    ),
  };
}

function setTextColor(pdf, color) {
  const rgb = hexToRgb(
    normalizeColor(
      color,
      "#111111",
    ),
  );

  pdf.setTextColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function setFillColor(pdf, color) {
  const rgb = hexToRgb(
    normalizeColor(
      color,
      "#ffffff",
    ),
  );

  pdf.setFillColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function setDrawColor(pdf, color) {
  const rgb = hexToRgb(
    normalizeColor(
      color,
      "#cccccc",
    ),
  );

  pdf.setDrawColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function calculateLineHeight(
  fontSize,
  lineSpacing,
) {
  return (
    fontSize *
    0.3528 *
    lineSpacing
  );
}

function wrapText(
  pdf,
  text,
  maxWidth,
) {
  return pdf.splitTextToSize(
    String(text ?? ""),
    maxWidth,
  );
}

function normalizeBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return [];
  }

  return blocks
    .map((block) => {
      if (!block) {
        return null;
      }

      return {
        type:
          block.type || "paragraph",
        text:
          typeof block.text === "string"
            ? block.text
            : String(block.text ?? ""),
        fontSize:
          normalizeFontSize(
            block.fontSize ?? 12,
          ),
        fontFamily:
          normalizeFontFamily(
            block.fontFamily,
          ),
        bold:
          Boolean(block.bold),
        italic:
          Boolean(block.italic),
        underline:
          Boolean(block.underline),
        alignment:
          normalizeAlignment(
            block.alignment,
          ),
        color:
          normalizeColor(
            block.color,
            "#111111",
          ),
        headingLevel:
          Number(block.headingLevel) || 0,
        spacingBefore:
          Math.max(
            0,
            Number(
              block.spacingBefore,
            ) || 0,
          ),
        spacingAfter:
          Math.max(
            0,
            Number(
              block.spacingAfter,
            ) || 5,
          ),
      };
    })
    .filter(Boolean);
}

function getFontStyle(block) {
  if (block.bold && block.italic) {
    return "bolditalic";
  }

  if (block.bold) {
    return "bold";
  }

  if (block.italic) {
    return "italic";
  }

  return "normal";
}

function resolveBlockFontSize(block) {
  if (
    block.headingLevel >= 1 &&
    block.headingLevel <= 6
  ) {
    const headingSizes = {
      1: 24,
      2: 20,
      3: 17,
      4: 14,
      5: 12,
      6: 11,
    };

    return headingSizes[
      block.headingLevel
    ];
  }

  return block.fontSize;
}

function resolveBlockSpacingAfter(block) {
  if (
    block.headingLevel >= 1 &&
    block.headingLevel <= 6
  ) {
    return 7;
  }

  return block.spacingAfter;
}

function renderParagraph(
  pdf,
  block,
  state,
  options,
) {
  const {
    margin,
    pageWidth,
    pageHeight,
    lineSpacing,
  } = options;

  const fontSize =
    resolveBlockFontSize(block);

  const lineHeight =
    calculateLineHeight(
      fontSize,
      lineSpacing,
    );

  const availableWidth =
    pageWidth -
    margin * 2;

  const lines = wrapText(
    pdf,
    block.text,
    availableWidth,
  );

  const blockStartY =
    state.y + block.spacingBefore;

  const requiredHeight =
    Math.max(
      lineHeight,
      lines.length * lineHeight,
    );

  function startNewPage() {
    pdf.addPage(
      normalizePageSize(
        options.pageSize,
      ).toLowerCase(),
      normalizeOrientation(
        options.orientation,
      ),
    );

    state.y = margin;
    state.pageNumber += 1;
  }

  if (
    blockStartY +
      requiredHeight >
    pageHeight - margin
  ) {
    startNewPage();
  } else {
    state.y =
      blockStartY;
  }

  const actualY =
    state.y + fontSize * 0.3528;

  const alignment =
    block.alignment;

  pdf.setFont(
    block.fontFamily,
    getFontStyle(block),
  );

  pdf.setFontSize(
    fontSize,
  );

  setTextColor(
    pdf,
    block.color,
  );

  if (alignment === "center") {
    lines.forEach((line) => {
      pdf.text(
        line,
        pageWidth / 2,
        state.y + fontSize * 0.3528,
        {
          align: "center",
        },
      );

      state.y +=
        lineHeight;
    });
  } else if (alignment === "right") {
    lines.forEach((line) => {
      pdf.text(
        line,
        pageWidth - margin,
        state.y + fontSize * 0.3528,
        {
          align: "right",
        },
      );

      state.y +=
        lineHeight;
    });
  } else {
    lines.forEach((line) => {
      pdf.text(
        line,
        margin,
        state.y + fontSize * 0.3528,
      );

      state.y +=
        lineHeight;
    });
  }

  if (block.underline) {
    const underlineY =
      state.y + 0.5;

    setDrawColor(
      pdf,
      block.color,
    );

    pdf.setLineWidth(0.2);

    if (alignment === "center") {
      lines.forEach((line, index) => {
        const lineWidth =
          pdf.getTextWidth(line);

        const baseline =
          actualY +
          index * lineHeight;

        pdf.line(
          pageWidth / 2 -
            lineWidth / 2,
          baseline + 1,
          pageWidth / 2 +
            lineWidth / 2,
          baseline + 1,
        );
      });
    } else if (alignment === "right") {
      lines.forEach((line, index) => {
        const lineWidth =
          pdf.getTextWidth(line);

        const baseline =
          actualY +
          index * lineHeight;

        pdf.line(
          pageWidth -
            margin -
            lineWidth,
          baseline + 1,
          pageWidth -
            margin,
          baseline + 1,
        );
      });
    } else {
      lines.forEach((line, index) => {
        const lineWidth =
          pdf.getTextWidth(line);

        const baseline =
          actualY +
          index * lineHeight;

        pdf.line(
          margin,
          baseline + 1,
          margin +
            lineWidth,
          baseline + 1,
        );
      });
    }

    state.y = Math.max(
      state.y,
      underlineY,
    );
  }

  state.y +=
    resolveBlockSpacingAfter(
      block,
    );
}

function renderDivider(
  pdf,
  state,
  options,
) {
  const {
    margin,
    pageWidth,
    pageHeight,
  } = options;

  const dividerY =
    state.y + 2;

  if (
    dividerY >
    pageHeight - margin
  ) {
    pdf.addPage(
      normalizePageSize(
        options.pageSize,
      ).toLowerCase(),
      normalizeOrientation(
        options.orientation,
      ),
    );

    state.y = margin;
  } else {
    state.y =
      dividerY;
  }

  setDrawColor(
    pdf,
    "#d8d8d8",
  );

  pdf.setLineWidth(
    0.35,
  );

  pdf.line(
    margin,
    state.y,
    pageWidth - margin,
    state.y,
  );

  state.y += 8;
}

function renderSpacer(
  state,
  amount = 5,
) {
  state.y +=
    Math.max(
      0,
      Number(amount) || 0,
    );
}

function renderPageBreak(
  pdf,
  state,
  options,
) {
  pdf.addPage(
    normalizePageSize(
      options.pageSize,
    ).toLowerCase(),
    normalizeOrientation(
      options.orientation,
    ),
  );

  state.y =
    options.margin;
  state.pageNumber += 1;
}

function renderTitle(
  pdf,
  title,
  state,
  options,
) {
  const block = {
    type: "heading",
    text: title,
    fontSize: 24,
    fontFamily: "helvetica",
    bold: true,
    italic: false,
    underline: false,
    alignment: "left",
    color: "#111111",
    headingLevel: 1,
    spacingBefore: 0,
    spacingAfter: 7,
  };

  renderParagraph(
    pdf,
    block,
    state,
    options,
  );
}

function renderFooter(
  pdf,
  text,
  options,
) {
  const {
    margin,
    pageWidth,
    pageHeight,
  } = options;

  const pageCount =
    pdf.getNumberOfPages();

  for (
    let page = 1;
    page <= pageCount;
    page += 1
  ) {
    pdf.setPage(page);

    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setFontSize(8);

    setTextColor(
      pdf,
      "#888888",
    );

    pdf.text(
      text,
      margin,
      pageHeight -
        margin / 2,
    );
  }
}

export async function createPdf(
  options = {},
  onProgress,
) {
  const {
    title = "",
    blocks = [],
    pageSize = "A4",
    orientation = "portrait",
    margin = 20,
    lineSpacing = 1.5,
    backgroundColor = "#ffffff",
    footer = "",
  } = options;

  const safePageSize =
    normalizePageSize(
      pageSize,
    );

  const safeOrientation =
    normalizeOrientation(
      orientation,
    );

  const safeMargin =
    normalizeMargin(
      margin,
    );

  const safeLineSpacing =
    normalizeLineSpacing(
      lineSpacing,
    );

  const normalizedBlocks =
    normalizeBlocks(
      blocks,
    );

  const {
    width: pageWidth,
    height: pageHeight,
  } = getPageDimensions(
    safePageSize,
    safeOrientation,
  );

  onProgress?.({
    stage: "initializing",
    progress: 5,
    message:
      "Preparing PDF document...",
  });

  const pdf =
    createPdfDocument(
      safePageSize,
      safeOrientation,
    );

  setFillColor(
    pdf,
    backgroundColor,
  );

  pdf.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    "F",
  );

  const state = {
    y: safeMargin,
    pageNumber: 1,
  };

  const renderOptions = {
    pageSize:
      safePageSize,
    orientation:
      safeOrientation,
    margin:
      safeMargin,
    lineSpacing:
      safeLineSpacing,
    pageWidth,
    pageHeight,
  };

  if (title.trim()) {
    renderTitle(
      pdf,
      title.trim(),
      state,
      renderOptions,
    );
  }

  onProgress?.({
    stage: "processing",
    progress: 15,
    message:
      "Writing document content...",
  });

  const totalBlocks =
    normalizedBlocks.length;

  for (
    let index = 0;
    index < totalBlocks;
    index += 1
  ) {
    const block =
      normalizedBlocks[index];

    if (block.type === "divider") {
      renderDivider(
        pdf,
        state,
        renderOptions,
      );
    } else if (
      block.type === "spacer"
    ) {
      renderSpacer(
        state,
        block.spacingAfter,
      );
    } else if (
      block.type === "page-break"
    ) {
      renderPageBreak(
        pdf,
        state,
        renderOptions,
      );
    } else {
      renderParagraph(
        pdf,
        block,
        state,
        renderOptions,
      );
    }

    const progress =
      15 +
      ((index + 1) /
        Math.max(
          totalBlocks,
          1,
        )) *
        70;

    onProgress?.({
      stage: "processing",
      progress: Math.round(
        progress,
      ),
      message:
        `Writing block ${index + 1} of ${totalBlocks}...`,
    });

    await new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          0,
        );
      },
    );
  }

  if (footer.trim()) {
    renderFooter(
      pdf,
      footer.trim(),
      renderOptions,
    );
  }

  onProgress?.({
    stage: "finalizing",
    progress: 95,
    message:
      "Finalizing PDF document...",
  });

  const blob =
    pdf.output("blob");

  onProgress?.({
    stage: "complete",
    progress: 100,
    message:
      "PDF created successfully.",
  });

  return {
    blob,
    fileName:
      `${title
        .trim()
        .replace(
          /[^a-z0-9]+/gi,
          "-",
        )
        .replace(
          /^-+|-+$/g,
          "",
        ) || "kaizen-document"}.pdf`,
    pageCount:
      pdf.getNumberOfPages(),
    size: blob.size,
  };
}

export function getCreatePdfDefaults() {
  return {
    title: "",
    blocks: [],
    pageSize: "A4",
    orientation: "portrait",
    margin: 20,
    lineSpacing: 1.5,
    backgroundColor: "#ffffff",
    footer: "",
  };
}

export {
  FONT_FAMILIES,
  FONT_SIZES,
  PAGE_SIZES_MM,
};

export default {
  createPdf,
  getCreatePdfDefaults,
};