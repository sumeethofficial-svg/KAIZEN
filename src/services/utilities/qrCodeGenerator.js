import QRCode from "qrcode";

export async function generateQRCode(text, options = {}) {
  if (!text || !text.trim()) {
    throw new Error("Please enter some text or a link.");
  }

  const {
    width = 320,
    margin = 2,
    errorCorrectionLevel = "M",
  } = options;

  try {
    const dataUrl = await QRCode.toDataURL(text.trim(), {
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    return {
      dataUrl,
      text: text.trim(),
      width,
    };
  } catch (error) {
    console.error("QR code generation error:", error);

    throw new Error("Failed to generate the QR code.");
  }
}