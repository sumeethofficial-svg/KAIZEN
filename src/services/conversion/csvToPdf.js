import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

function detectDelimiter(text) {
  const candidates = [",", ";", "\t", "|"];
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .slice(0, 10);

  if (!lines.length) {
    return ",";
  }

  let bestDelimiter = ",";
  let bestScore = -Infinity;

  for (const delimiter of candidates) {
    let score = 0;
    let consistency = 0;

    const counts = lines.map((line) => {
      let count = 0;
      let insideQuotes = false;

      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];

        if (char === '"') {
          if (
            insideQuotes &&
            line[index + 1] === '"'
          ) {
            index += 1;
            continue;
          }

          insideQuotes = !insideQuotes;
          continue;
        }

        if (!insideQuotes && char === delimiter) {
          count += 1;
        }
      }

      return count;
    });

    const positiveCounts = counts.filter(
      (count) => count > 0
    );

    if (!positiveCounts.length) {
      continue;
    }

    const average =
      positiveCounts.reduce(
        (sum, count) => sum + count,
        0
      ) / positiveCounts.length;

    for (const count of positiveCounts) {
      if (Math.abs(count - average) <= 1) {
        consistency += 1;
      }
    }

    score =
      average * 10 +
      consistency * 5 +
      positiveCounts.length;

    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (
        insideQuotes &&
        line[index + 1] === '"'
      ) {
        current += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && char === delimiter) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);

  return values;
}

export function parseCsv(text, delimiter) {
  if (typeof text !== "string") {
    throw new Error("CSV content must be text.");
  }

  let source = text.replace(/^\uFEFF/, "");

  if (!source.trim()) {
    return {
      rows: [],
      delimiter: delimiter || ",",
    };
  }

  const actualDelimiter =
    delimiter && delimiter !== "auto"
      ? delimiter
      : detectDelimiter(source);

  const rows = [];
  let currentField = "";
  let currentRow = [];
  let insideQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '"') {
      if (
        insideQuotes &&
        next === '"'
      ) {
        currentField += '"';
        index += 1;
        continue;
      }

      insideQuotes = !insideQuotes;
      continue;
    }

    if (!insideQuotes && char === actualDelimiter) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (!insideQuotes && char === "\n") {
      currentRow.push(
        currentField.replace(/\r$/, "")
      );

      rows.push(currentRow);

      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  if (
    currentField.length > 0 ||
    currentRow.length > 0
  ) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  const normalizedRows = rows
    .map((row) =>
      row.map((value) =>
        value.trim()
      )
    )
    .filter((row) =>
      row.some((value) => value !== "")
    );

  if (!normalizedRows.length) {
    return {
      rows: [],
      delimiter: actualDelimiter,
    };
  }

  const columnCount = Math.max(
    ...normalizedRows.map(
      (row) => row.length
    )
  );

  const normalized = normalizedRows.map(
    (row) => {
      const copy = [...row];

      while (copy.length < columnCount) {
        copy.push("");
      }

      return copy;
    }
  );

  return {
    rows: normalized,
    delimiter: actualDelimiter,
  };
}

function getPageFormat(pageSize) {
  switch (pageSize) {
    case "a3":
      return "a3";

    case "letter":
      return "letter";

    case "legal":
      return "legal";

    case "a4":
    default:
      return "a4";
  }
}

function getDelimiterName(delimiter) {
  switch (delimiter) {
    case ",":
      return "Comma";

    case ";":
      return "Semicolon";

    case "\t":
      return "Tab";

    case "|":
      return "Pipe";

    default:
      return "Custom";
  }
}

export async function csvToPdf(
  csvText,
  {
    fileName = "csv-document.pdf",
    title = "CSV Document",
    pageSize = "a4",
    orientation = "landscape",
    margin = 24,
    fontSize = 8,
    headerColor = "#f97316",
    headerTextColor = "#ffffff",
    bodyColor = "#ffffff",
    alternateRowColor = "#f7f7f7",
    textColor = "#1f1f1f",
    delimiter = "auto",
    firstRowAsHeader = true,
    repeatHeader = true,
    showPageNumbers = true,
    showDelimiterInfo = false,
    onProgress,
  } = {}
) {
  if (
    typeof csvText !== "string" ||
    !csvText.trim()
  ) {
    throw new Error("CSV content is empty.");
  }

  onProgress?.({
    stage: "parsing",
    progress: 10,
    message: "Parsing CSV...",
  });

  const parsed = parseCsv(
    csvText,
    delimiter
  );

  if (!parsed.rows.length) {
    throw new Error(
      "No CSV rows were found."
    );
  }

  const allRows = parsed.rows;

  const headers =
    firstRowAsHeader
      ? allRows[0]
      : allRows[0].map(
          (_, index) =>
            `Column ${index + 1}`
        );

  const bodyRows =
    firstRowAsHeader
      ? allRows.slice(1)
      : allRows;

  onProgress?.({
    stage: "building",
    progress: 25,
    message: `Preparing ${bodyRows.length.toLocaleString()} rows...`,
  });

  const pdf = new jsPDF({
    orientation,
    unit: "pt",
    format: getPageFormat(pageSize),
    compress: true,
  });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const safeMargin = Math.max(
    18,
    Number(margin) || 24
  );

  const displayTitle =
    title.trim() || "CSV Document";

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(16);
  pdf.setTextColor(textColor);

  pdf.text(
    displayTitle,
    safeMargin,
    safeMargin
  );

  if (showDelimiterInfo) {
    pdf.setFont(
      "helvetica",
      "normal"
    );

    pdf.setFontSize(8);

    pdf.setTextColor("#777777");

    pdf.text(
      `Delimiter: ${getDelimiterName(
        parsed.delimiter
      )} · ${allRows.length.toLocaleString()} rows · ${
        headers.length
      } columns`,
      safeMargin,
      safeMargin + 14
    );
  }

  const startY =
    safeMargin +
    (showDelimiterInfo ? 28 : 20);

  const tableHead = firstRowAsHeader
    ? [headers]
    : [];

  const tableBody = bodyRows;

  autoTable(pdf, {
    startY,

    head: tableHead,
    body: tableBody,

    theme: "grid",

    margin: {
      left: safeMargin,
      right: safeMargin,
    },

    styles: {
      font: "helvetica",
      fontSize,
      textColor,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "middle",
    },

    headStyles: {
      fillColor: headerColor,
      textColor: headerTextColor,
      fontStyle: "bold",
      halign: "left",
      valign: "middle",
    },

    bodyStyles: {
      fillColor: bodyColor,
    },

    alternateRowStyles: {
      fillColor: alternateRowColor,
    },

    columnStyles: {
      0: {
        cellWidth: "auto",
      },
    },

    showHead:
      firstRowAsHeader && repeatHeader
        ? "everyPage"
        : "firstPage",

    didDrawPage: () => {
      if (!showPageNumbers) {
        return;
      }

      const currentPage =
        pdf.internal.getNumberOfPages();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      pdf.setFont(
        "helvetica",
        "normal"
      );

      pdf.setFontSize(8);

      pdf.setTextColor("#777777");

      pdf.text(
        `Page ${currentPage}`,
        pageWidth - safeMargin,
        pageHeight - 10,
        {
          align: "right",
        }
      );
    },

    didParseCell: (data) => {
      if (
        data.section === "body" &&
        typeof data.cell.raw === "string"
      ) {
        data.cell.text = [
          String(data.cell.raw),
        ];
      }
    },
  });

  onProgress?.({
    stage: "finalizing",
    progress: 92,
    message: "Finalizing PDF...",
  });

  const outputName =
    fileName.toLowerCase().endsWith(".pdf")
      ? fileName
      : `${fileName}.pdf`;

  const blob = pdf.output("blob");

  const result = {
    blob,
    fileName: outputName,
    pageCount:
      pdf.internal.getNumberOfPages(),
    byteSize: blob.size,
    rowCount: bodyRows.length,
    columnCount: headers.length,
    delimiter: parsed.delimiter,
  };

  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "PDF ready.",
  });

  return result;
}

export function getCsvPreview(
  csvText,
  {
    delimiter = "auto",
    firstRowAsHeader = true,
    maxRows = 100,
  } = {}
) {
  const parsed = parseCsv(
    csvText,
    delimiter
  );

  if (!parsed.rows.length) {
    return {
      headers: [],
      rows: [],
      totalRows: 0,
      columnCount: 0,
      delimiter:
        parsed.delimiter,
    };
  }

  const headers =
    firstRowAsHeader
      ? parsed.rows[0]
      : parsed.rows[0].map(
          (_, index) =>
            `Column ${index + 1}`
        );

  const rows =
    firstRowAsHeader
      ? parsed.rows.slice(
          1,
          maxRows + 1
        )
      : parsed.rows.slice(
          0,
          maxRows
        );

  return {
    headers,
    rows,
    totalRows: firstRowAsHeader
      ? Math.max(
          parsed.rows.length - 1,
          0
        )
      : parsed.rows.length,
    columnCount:
      headers.length,
    delimiter:
      parsed.delimiter,
  };
}