import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Supported Excel extensions.
 */
const SUPPORTED_EXTENSIONS = [".xlsx", ".xls"];

/**
 * Human-readable file size.
 */
function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Returns the extension of a file.
 */
function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot).toLowerCase();
}

/**
 * Validates whether a file is a supported Excel file.
 */
function isSupportedExcelFile(file) {
  if (!(file instanceof File)) {
    return false;
  }

  const extension = getFileExtension(file.name);

  return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 * Converts a workbook sheet into a normalized matrix.
 *
 * The first row becomes the table header.
 */
function sheetToMatrix(worksheet) {
  const matrix = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return matrix.map((row) =>
    row.map((cell) => {
      if (cell === null || cell === undefined) {
        return "";
      }

      return String(cell);
    }),
  );
}

/**
 * Cleans completely empty rows from a worksheet.
 */
function removeEmptyRows(matrix) {
  return matrix.filter((row) =>
    row.some((cell) => String(cell).trim() !== ""),
  );
}

/**
 * Determines the number of columns in a sheet.
 */
function getColumnCount(matrix) {
  if (!matrix.length) {
    return 0;
  }

  return matrix.reduce(
    (maximum, row) => Math.max(maximum, row.length),
    0,
  );
}

/**
 * Determines the number of populated rows in a sheet.
 */
function getRowCount(matrix) {
  return matrix.length;
}

/**
 * Normalizes all rows so they have the same number of columns.
 */
function normalizeMatrix(matrix, columnCount) {
  return matrix.map((row) => {
    const normalizedRow = [...row];

    while (normalizedRow.length < columnCount) {
      normalizedRow.push("");
    }

    return normalizedRow.slice(0, columnCount);
  });
}

/**
 * Calculates a sensible PDF orientation.
 */
function getAutomaticOrientation(columnCount) {
  if (columnCount >= 7) {
    return "landscape";
  }

  return "portrait";
}

/**
 * Returns the PDF page format accepted by jsPDF.
 */
function normalizePageFormat(pageSize) {
  const allowedSizes = {
    A4: "a4",
    A3: "a3",
    Letter: "letter",
    Legal: "legal",
  };

  return allowedSizes[pageSize] || "a4";
}

/**
 * Extracts workbook information without generating a PDF.
 */
export async function getExcelToPdfInfo(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid Excel file.");
  }

  if (!isSupportedExcelFile(file)) {
    throw new Error("Only .xlsx and .xls files are supported.");
  }

  const arrayBuffer = await file.arrayBuffer();

  let workbook;

  try {
    workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });
  } catch (error) {
    console.error("Excel workbook read error:", error);

    throw new Error(
      "This Excel file could not be opened. It may be corrupted or unsupported.",
    );
  }

  const sheets = workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];

    const matrix = removeEmptyRows(sheetToMatrix(worksheet));
    const columnCount = getColumnCount(matrix);
    const rowCount = getRowCount(matrix);

    return {
      name: sheetName,
      rows: rowCount,
      columns: columnCount,
    };
  });

  const totalRows = sheets.reduce((sum, sheet) => sum + sheet.rows, 0);

  return {
    name: file.name,
    size: file.size,
    sizeLabel: formatFileSize(file.size),
    extension: getFileExtension(file.name),
    sheetCount: sheets.length,
    totalRows,
    sheets,
  };
}

/**
 * Converts an Excel workbook into a PDF document.
 *
 * options:
 * - pageSize: A4 | A3 | Letter | Legal
 * - orientation: auto | portrait | landscape
 * - fontSize: 6 - 12
 * - margin: number in mm
 * - repeatHeaders: boolean
 * - includeSheetTitles: boolean
 * - alternateRowColors: boolean
 */
export async function excelToPdf(
  file,
  options = {},
  onProgress,
) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid Excel file.");
  }

  if (!isSupportedExcelFile(file)) {
    throw new Error("Only .xlsx and .xls files are supported.");
  }

  const arrayBuffer = await file.arrayBuffer();

  let workbook;

  try {
    workbook = XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true,
    });
  } catch (error) {
    console.error("Excel workbook read error:", error);

    throw new Error(
      "This Excel file could not be opened. It may be corrupted or unsupported.",
    );
  }

  const {
    pageSize = "A4",
    orientation = "auto",
    fontSize = 7,
    margin = 10,
    repeatHeaders = true,
    includeSheetTitles = true,
    alternateRowColors = true,
  } = options;

  const safeFontSize = Math.min(
    12,
    Math.max(6, Number(fontSize) || 7),
  );

  const safeMargin = Math.min(
    30,
    Math.max(4, Number(margin) || 10),
  );

  const sheets = workbook.SheetNames;

  if (sheets.length === 0) {
    throw new Error("The Excel workbook does not contain any worksheets.");
  }

  onProgress?.({
    stage: "loading",
    progress: 10,
    message: "Reading Excel workbook...",
  });

  let pdf = null;
  let populatedSheetCount = 0;

  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    const sheetName = sheets[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];

    let matrix = removeEmptyRows(sheetToMatrix(worksheet));

    if (matrix.length === 0) {
      continue;
    }

    populatedSheetCount += 1;

    const columnCount = getColumnCount(matrix);

    matrix = normalizeMatrix(matrix, columnCount);

    const selectedOrientation =
      orientation === "auto"
        ? getAutomaticOrientation(columnCount)
        : orientation === "landscape"
          ? "landscape"
          : "portrait";

    if (pdf === null) {
      pdf = new jsPDF({
        orientation: selectedOrientation,
        unit: "mm",
        format: normalizePageFormat(pageSize),
        compress: true,
      });
    } else {
      pdf.addPage(
        normalizePageFormat(pageSize),
        selectedOrientation,
      );
    }

    const sheetTitleY = safeMargin;

    if (includeSheetTitles) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text(sheetName, safeMargin, sheetTitleY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
    }

    const header = matrix[0];
    const body = matrix.slice(1);

    /*
     * If the worksheet contains only one row, still render it
     * as a header so the user doesn't lose its contents.
     */
    const effectiveBody =
      body.length > 0
        ? body
        : [new Array(columnCount).fill("")];

    const tableStartY = includeSheetTitles
      ? safeMargin + 7
      : safeMargin;

    autoTable(pdf, {
      startY: tableStartY,
      head: [header],
      body: effectiveBody,

      margin: {
        top: safeMargin,
        right: safeMargin,
        bottom: safeMargin,
        left: safeMargin,
      },

      theme: "grid",

      styles: {
        font: "helvetica",
        fontSize: safeFontSize,
        cellPadding: 2,
        overflow: "linebreak",
        valign: "middle",
        lineWidth: 0.1,
      },

      headStyles: {
        fontStyle: "bold",
        fontSize: safeFontSize,
        halign: "left",
        valign: "middle",
      },

      alternateRowStyles: alternateRowColors
        ? {
            fillColor: [245, 245, 245],
          }
        : undefined,

      bodyStyles: {
        fontStyle: "normal",
      },

      showHead: repeatHeaders ? "everyPage" : "firstPage",

      didParseCell(data) {
        /*
         * Keep spreadsheet-looking text rather than allowing
         * unexpected objects to reach jsPDF.
         */
        if (
          data.cell &&
          data.cell.raw !== null &&
          data.cell.raw !== undefined
        ) {
          data.cell.text = [String(data.cell.raw)];
        }
      },
    });

    const sheetProgress =
      15 + ((sheetIndex + 1) / sheets.length) * 75;

    onProgress?.({
      stage: "processing",
      progress: Math.round(sheetProgress),
      message: `Processing sheet ${sheetIndex + 1} of ${sheets.length}...`,
    });

    /*
     * Give the browser a chance to update the interface between
     * large worksheet operations.
     */
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  if (!pdf || populatedSheetCount === 0) {
    throw new Error(
      "The workbook does not contain any populated worksheets.",
    );
  }

  onProgress?.({
    stage: "finalizing",
    progress: 95,
    message: "Finalizing PDF...",
  });

  const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
  const outputFileName = `${baseName}.pdf`;

  const pdfBlob = pdf.output("blob");

  onProgress?.({
    stage: "complete",
    progress: 100,
    message: "Excel converted successfully.",
  });

  return {
    blob: pdfBlob,
    fileName: outputFileName,
    sheets: populatedSheetCount,
    size: pdfBlob.size,
  };
}

export default {
  getExcelToPdfInfo,
  excelToPdf,
};