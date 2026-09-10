import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

/**
 * Validate a PDF file.
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
 * Get basic PDF information.
 *
 * We intentionally do not use pdf-lib here because encrypted
 * PDF creation is handled by the dedicated encryption library.
 */
export async function getEncryptPdfInfo(file) {
  validatePdfFile(file);

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

  return {
    fileName: file.name,
    size: file.size,
  };
}

/**
 * Normalize encryption options.
 */
export function createEncryptPdfOptions(
  options = {}
) {
  return {
    ownerPassword:
      String(options.ownerPassword ?? ""),

    allowPrinting:
      options.allowPrinting === true,

    allowCopying:
      options.allowCopying === true,

    allowModifying:
      options.allowModifying === true,

    allowAnnotating:
      options.allowAnnotating === true,

    allowFillingForms:
      options.allowFillingForms === true,

    allowDocumentAssembly:
      options.allowDocumentAssembly === true,
  };
}

/**
 * Validate password and encryption settings.
 */
export function validateEncryptPdfOptions(
  options = {}
) {
  const userPassword = String(
    options.userPassword ?? ""
  );

  if (!userPassword) {
    throw new Error(
      "Please enter a password."
    );
  }

  if (userPassword.length < 4) {
    throw new Error(
      "Password must contain at least 4 characters."
    );
  }

  const ownerPassword = String(
    options.ownerPassword ?? ""
  );

  if (
    ownerPassword &&
    ownerPassword.length < 4
  ) {
    throw new Error(
      "Owner password must contain at least 4 characters."
    );
  }

  if (
    ownerPassword &&
    ownerPassword === userPassword
  ) {
    throw new Error(
      "For stronger security, use a different owner password."
    );
  }

  return {
    userPassword,
    ...createEncryptPdfOptions(
      options
    ),
  };
}

/**
 * Verify that the returned bytes look like a PDF.
 */
function validateOutputBytes(bytes) {
  if (
    !bytes ||
    bytes.length < 5
  ) {
    throw new Error(
      "The encryption engine returned an empty PDF."
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
      "The encryption engine returned invalid PDF data."
    );
  }
}

/**
 * Encrypt a PDF using AES-256.
 *
 * The encryption itself happens in the browser through
 * @pdfsmaller/pdf-encrypt, so the source PDF does not need
 * to be uploaded to a server.
 */
export async function encryptPdf(
  file,
  options = {},
  onProgress
) {
  validatePdfFile(file);

  const normalized =
    validateEncryptPdfOptions(
      options
    );

  const inputBytes =
    new Uint8Array(
      await file.arrayBuffer()
    );

  onProgress?.({
    current: 0,
    total: 1,
    percent: 0,
  });

  let encryptedBytes;

  try {
    encryptedBytes =
      await encryptPDF(
        inputBytes,
        normalized.userPassword,
        {
          algorithm: "AES-256",

          ownerPassword:
            normalized.ownerPassword ||
            undefined,

          allowPrinting:
            normalized.allowPrinting,

          allowCopying:
            normalized.allowCopying,

          allowModifying:
            normalized.allowModifying,

          allowAnnotating:
            normalized.allowAnnotating,

          allowFillingForms:
            normalized.allowFillingForms,

          allowDocumentAssembly:
            normalized.allowDocumentAssembly,
        }
      );
  } catch (error) {
    const message =
      error?.message ||
      "The PDF could not be encrypted.";

    throw new Error(message);
  }

  validateOutputBytes(
    encryptedBytes
  );

  onProgress?.({
    current: 1,
    total: 1,
    percent: 100,
  });

  return new Blob(
    [encryptedBytes],
    {
      type: "application/pdf",
    }
  );
}