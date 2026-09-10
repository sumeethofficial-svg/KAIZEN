import {
  createPdfToolkit,
  PdfPasswordError,
} from "pdfstudio";

let toolkitPromise = null;

/**
 * Create and cache the PDF toolkit.
 *
 * pdfstudio loads qpdf WebAssembly once, so we reuse the
 * initialized toolkit across operations.
 */
async function getPdfToolkit() {
  if (!toolkitPromise) {
    toolkitPromise = createPdfToolkit();
  }

  return toolkitPromise;
}

/**
 * Validate the supplied PDF file.
 */
function validatePdfFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error("The selected file must be a PDF.");
  }
}

/**
 * Validate the PDF file signature.
 */
async function getPdfBytes(file) {
  const bytes = new Uint8Array(
    await file.arrayBuffer()
  );

  if (
    bytes.length < 5 ||
    String.fromCharCode(
      bytes[0],
      bytes[1],
      bytes[2],
      bytes[3],
      bytes[4]
    ) !== "%PDF-"
  ) {
    throw new Error(
      "The selected file does not appear to be a valid PDF."
    );
  }

  return bytes;
}

/**
 * Get basic information about the PDF.
 */
export async function getUnlockPdfInfo(file) {
  validatePdfFile(file);

  const bytes = await getPdfBytes(file);
  const pdf = await getPdfToolkit();

  let pageCount = null;
  let encrypted = null;
  let requiresPassword = null;

  try {
    if (typeof pdf.pageCount === "function") {
      pageCount = await pdf.pageCount(bytes);
    }

    if (typeof pdf.isEncrypted === "function") {
      encrypted = await pdf.isEncrypted(bytes);
    }

    if (
      typeof pdf.requiresPassword ===
      "function"
    ) {
      requiresPassword =
        await pdf.requiresPassword(bytes);
    }
  } catch {
    /*
     * Some pdfstudio versions expose slightly different
     * inspection helpers. The unlock operation itself is
     * still authoritative.
     */
  }

  return {
    fileName: file.name,
    size: file.size,
    pageCount,
    encrypted,
    requiresPassword,
  };
}

/**
 * Normalize unlock options.
 */
export function createUnlockPdfOptions(
  options = {}
) {
  return {
    password: String(
      options.password ?? ""
    ),
  };
}

/**
 * Validate unlock options.
 */
export function validateUnlockPdfOptions(
  options = {}
) {
  const normalized =
    createUnlockPdfOptions(options);

  if (!normalized.password) {
    throw new Error(
      "Enter the PDF password or owner password."
    );
  }

  return normalized;
}

/**
 * Verify that returned data is a PDF.
 */
function validateOutputBytes(bytes) {
  if (!bytes || bytes.length < 5) {
    throw new Error(
      "The unlock operation returned an empty PDF."
    );
  }

  const header = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4]
  );

  if (header !== "%PDF-") {
    throw new Error(
      "The unlock operation returned invalid PDF data."
    );
  }
}

/**
 * Unlock a password-protected/restricted PDF.
 *
 * pdfstudio's unlock operation uses qpdf compiled to
 * WebAssembly and runs locally in the browser.
 *
 * A valid user password or owner password may be supplied.
 * The resulting PDF is unprotected and its restrictions
 * are removed.
 */
export async function unlockPdf(
  file,
  options = {},
  onProgress
) {
  validatePdfFile(file);

  const normalized =
    validateUnlockPdfOptions(
      options
    );

  const bytes =
    await getPdfBytes(file);

  onProgress?.({
    current: 0,
    total: 1,
    percent: 0,
  });

  const pdf =
    await getPdfToolkit();

  let unlockedBytes;

  try {
    unlockedBytes =
      await pdf.unlock(
        bytes,
        {
          password:
            normalized.password,
        }
      );
  } catch (error) {
    if (
      error instanceof PdfPasswordError
    ) {
      throw new Error(
        "The password is incorrect. Please enter the correct PDF password."
      );
    }

    const message =
      error?.message ||
      "";

    const normalizedMessage =
      message.toLowerCase();

    if (
      normalizedMessage.includes(
        "password"
      ) ||
      normalizedMessage.includes(
        "invalid password"
      )
    ) {
      throw new Error(
        "The password is incorrect or the PDF could not be unlocked with it."
      );
    }

    if (
      normalizedMessage.includes(
        "not encrypted"
      ) ||
      normalizedMessage.includes(
        "not encrypted"
      )
    ) {
      throw new Error(
        "This PDF is not password protected."
      );
    }

    throw new Error(
      message ||
        "Unable to unlock the PDF."
    );
  }

  const outputBytes =
    unlockedBytes instanceof
    Uint8Array
      ? unlockedBytes
      : new Uint8Array(
          unlockedBytes
        );

  validateOutputBytes(
    outputBytes
  );

  onProgress?.({
    current: 1,
    total: 1,
    percent: 100,
  });

  return new Blob(
    [outputBytes],
    {
      type: "application/pdf",
    }
  );
}