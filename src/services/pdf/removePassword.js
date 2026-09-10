import {
  decryptPDF,
  isEncrypted,
} from "@pdfsmaller/pdf-decrypt";

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
 * Get basic information about the PDF.
 */
export async function getRemovePasswordPdfInfo(file) {
  validatePdfFile(file);

  const pdfBytes = new Uint8Array(
    await file.arrayBuffer()
  );

  if (
    pdfBytes.length < 5 ||
    String.fromCharCode(
      pdfBytes[0],
      pdfBytes[1],
      pdfBytes[2],
      pdfBytes[3],
      pdfBytes[4]
    ) !== "%PDF-"
  ) {
    throw new Error(
      "The selected file does not appear to be a valid PDF."
    );
  }

  const encryptionInfo =
    await isEncrypted(pdfBytes);

  return {
    fileName: file.name,
    size: file.size,
    encrypted: Boolean(
      encryptionInfo?.encrypted
    ),
    algorithm:
      encryptionInfo?.algorithm || null,
    version:
      encryptionInfo?.version || null,
    revision:
      encryptionInfo?.revision || null,
    keyLength:
      encryptionInfo?.keyLength || null,
  };
}

/**
 * Normalize remove-password options.
 */
export function createRemovePasswordOptions(
  options = {}
) {
  return {
    password: String(
      options.password ?? ""
    ),
  };
}

/**
 * Validate remove-password options.
 */
export function validateRemovePasswordOptions(
  options = {}
) {
  const normalized =
    createRemovePasswordOptions(
      options
    );

  if (!normalized.password) {
    throw new Error(
      "Enter the current PDF password."
    );
  }

  return normalized;
}

/**
 * Remove password protection from an encrypted PDF.
 *
 * Supports AES-256 and RC4 PDFs through
 * @pdfsmaller/pdf-decrypt.
 *
 * The function accepts the user password or owner password.
 */
export async function removePassword(
  file,
  options = {},
  onProgress
) {
  validatePdfFile(file);

  const normalized =
    validateRemovePasswordOptions(
      options
    );

  const pdfBytes = new Uint8Array(
    await file.arrayBuffer()
  );

  onProgress?.({
    current: 0,
    total: 1,
    percent: 0,
  });

  const encryptionInfo =
    await isEncrypted(pdfBytes);

  if (!encryptionInfo?.encrypted) {
    throw new Error(
      "This PDF is not password protected."
    );
  }

  let decryptedBytes;

  try {
    decryptedBytes =
      await decryptPDF(
        pdfBytes,
        normalized.password
      );
  } catch (error) {
    const message =
      String(
        error?.message || ""
      ).toLowerCase();

    if (
      message.includes(
        "incorrect password"
      ) ||
      message.includes(
        "password"
      )
    ) {
      throw new Error(
        "The password is incorrect. Please enter the correct PDF password."
      );
    }

    if (
      message.includes(
        "unsupported encryption"
      )
    ) {
      throw new Error(
        "This PDF uses an encryption method that KAIZEN does not currently support."
      );
    }

    if (
      message.includes(
        "not encrypted"
      )
    ) {
      throw new Error(
        "This PDF is not password protected."
      );
    }

    throw new Error(
      error?.message ||
        "Unable to remove the PDF password."
    );
  }

  if (
    !decryptedBytes ||
    decryptedBytes.length === 0
  ) {
    throw new Error(
      "The decrypted PDF is empty."
    );
  }

  const outputBytes =
    decryptedBytes instanceof Uint8Array
      ? decryptedBytes
      : new Uint8Array(
          decryptedBytes
        );

  if (
    outputBytes.length < 5 ||
    String.fromCharCode(
      outputBytes[0],
      outputBytes[1],
      outputBytes[2],
      outputBytes[3],
      outputBytes[4]
    ) !== "%PDF-"
  ) {
    throw new Error(
      "The decryption engine returned invalid PDF data."
    );
  }

  /*
   * Verify that the resulting PDF is no longer encrypted.
   * This prevents us from reporting success if a malformed
   * or partially decrypted document is returned.
   */
  const remainingEncryption =
    await isEncrypted(outputBytes);

  if (
    remainingEncryption?.encrypted
  ) {
    throw new Error(
      "The PDF could not be fully unlocked with the supplied password."
    );
  }

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