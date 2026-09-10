import {
  getDocument,
  GlobalWorkerOptions,
} from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PDFDocument } from "pdf-lib";

GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Validate a PDF file.
 */
function validatePdfFile(file) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid PDF file.");
  }

  if (
    file.type !== "application/pdf" &&
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new Error("The selected file must be a PDF.");
  }
}

/**
 * Validate an image handwriting sample.
 */
function validateHandwritingSample(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid handwriting sample."
    );
  }

  const validTypes = [
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  const lowerName = file.name.toLowerCase();

  const validExtension =
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp");

  if (
    !validTypes.includes(file.type) &&
    !validExtension
  ) {
    throw new Error(
      "Handwriting samples must be PNG, JPG, JPEG, or WebP images."
    );
  }
}

/**
 * Load a PDF.js document.
 */
async function loadPdfJsDocument(file) {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  return loadingTask.promise;
}

/**
 * Safely clean up a PDF.js document.
 */
async function cleanupPdfDocument(pdf) {
  if (!pdf) {
    return;
  }

  try {
    if (typeof pdf.cleanup === "function") {
      pdf.cleanup();
    }
  } catch {
    // Ignore cleanup errors.
  }

  try {
    if (typeof pdf.destroy === "function") {
      await pdf.destroy();
    }
  } catch {
    // Ignore cleanup errors.
  }
}

/**
 * Get basic PDF information.
 */
export async function getPdfToHandwritingInfo(file) {
  validatePdfFile(file);

  const pdf = await loadPdfJsDocument(file);

  try {
    return {
      fileName: file.name,
      pageCount: pdf.numPages,
      size: file.size,
    };
  } finally {
    await cleanupPdfDocument(pdf);
  }
}

/**
 * Built-in handwriting styles.
 *
 * These are visual profiles used by the current local
 * raster-based handwriting transformation.
 */
export const HANDWRITING_STYLES = {
  classic: {
    id: "classic",
    name: "Classic Student",
    description:
      "Natural classroom-style handwriting with mild variation.",
    inkColor: "blue",
    inkIntensity: 0.84,
    paperIntensity: 0.12,
    slant: 1.5,
    texture: 0.15,
    jitter: 0.14,
    strokeWeight: 1,
    softness: 0.08,
  },

  neat: {
    id: "neat",
    name: "Neat Notes",
    description:
      "Clean, compact and consistent handwritten notes.",
    inkColor: "blue",
    inkIntensity: 0.9,
    paperIntensity: 0.08,
    slant: 0.7,
    texture: 0.08,
    jitter: 0.05,
    strokeWeight: 0.7,
    softness: 0.05,
  },

  casual: {
    id: "casual",
    name: "Casual",
    description:
      "Relaxed everyday handwriting with natural irregularity.",
    inkColor: "blue",
    inkIntensity: 0.78,
    paperIntensity: 0.14,
    slant: 2.7,
    texture: 0.2,
    jitter: 0.24,
    strokeWeight: 1.1,
    softness: 0.12,
  },

  elegant: {
    id: "elegant",
    name: "Elegant",
    description:
      "Refined handwriting with a smoother forward slant.",
    inkColor: "blue",
    inkIntensity: 0.76,
    paperIntensity: 0.1,
    slant: 4.5,
    texture: 0.1,
    jitter: 0.08,
    strokeWeight: 0.65,
    softness: 0.1,
  },

  marker: {
    id: "marker",
    name: "Bold Marker",
    description:
      "Thicker, stronger handwriting with pronounced ink.",
    inkColor: "black",
    inkIntensity: 0.94,
    paperIntensity: 0.08,
    slant: 1.2,
    texture: 0.17,
    jitter: 0.11,
    strokeWeight: 1.65,
    softness: 0.04,
  },
};

/**
 * Normalize custom handwriting analysis.
 */
function normalizeCustomProfile(profile = {}) {
  return {
    inkColor: profile.inkColor || "blue",

    inkIntensity:
      typeof profile.inkIntensity === "number"
        ? Math.max(
            0.45,
            Math.min(1, profile.inkIntensity)
          )
        : 0.82,

    paperIntensity:
      typeof profile.paperIntensity === "number"
        ? Math.max(
            0,
            Math.min(0.35, profile.paperIntensity)
          )
        : 0.12,

    slant:
      typeof profile.slant === "number"
        ? Math.max(-8, Math.min(8, profile.slant))
        : 1.5,

    texture:
      typeof profile.texture === "number"
        ? Math.max(0, Math.min(1, profile.texture))
        : 0.15,

    jitter:
      typeof profile.jitter === "number"
        ? Math.max(0, Math.min(1, profile.jitter))
        : 0.12,

    strokeWeight:
      typeof profile.strokeWeight === "number"
        ? Math.max(
            0.4,
            Math.min(2.5, profile.strokeWeight)
          )
        : 1,

    softness:
      typeof profile.softness === "number"
        ? Math.max(
            0,
            Math.min(0.5, profile.softness)
          )
        : 0.08,
  };
}

/**
 * Create normalized handwriting options.
 */
export function createPdfToHandwritingOptions(
  options = {}
) {
  const styleId =
    options.style || "classic";

  const builtInStyle =
    HANDWRITING_STYLES[styleId] ||
    HANDWRITING_STYLES.classic;

  const baseProfile =
    styleId === "custom"
      ? normalizeCustomProfile(
          options.customProfile
        )
      : builtInStyle;

  return {
    style: styleId,

    styleName:
      styleId === "custom"
        ? "Your Handwriting"
        : builtInStyle.name,

    renderScale:
      typeof options.renderScale === "number"
        ? Math.max(
            0.75,
            Math.min(3, options.renderScale)
          )
        : 1.5,

    paperStyle:
      options.paperStyle ||
      "plain",

    customProfile:
      normalizeCustomProfile(
        options.customProfile
      ),

    customSample:
      options.customSample || null,

    ...baseProfile,

    /*
     * User-level adjustments.
     *
     * These are intentionally small so the selected style
     * remains recognizable and doesn't become excessive.
     */
    userIntensity:
      typeof options.userIntensity === "number"
        ? Math.max(
            0.6,
            Math.min(1.15, options.userIntensity)
          )
        : 1,

    userSlant:
      typeof options.userSlant === "number"
        ? Math.max(-4, Math.min(4, options.userSlant))
        : 0,

    userTexture:
      typeof options.userTexture === "number"
        ? Math.max(
            0,
            Math.min(1, options.userTexture)
          )
        : 0,

    userJitter:
      typeof options.userJitter === "number"
        ? Math.max(
            0,
            Math.min(1, options.userJitter)
          )
        : 0,
  };
}

/**
 * Return a style list suitable for the UI.
 */
export function getHandwritingStyles() {
  return Object.values(HANDWRITING_STYLES).map(
    (style) => ({
      id: style.id,
      name: style.name,
      description: style.description,
    })
  );
}

/**
 * Return the requested base ink colour.
 */
function getInkBaseColor(inkColor) {
  switch (inkColor) {
    case "black":
      return {
        r: 36,
        g: 36,
        b: 38,
      };

    case "green":
      return {
        r: 28,
        g: 92,
        b: 58,
      };

    case "red":
      return {
        r: 145,
        g: 45,
        b: 45,
      };

    case "blue":
    default:
      return {
        r: 32,
        g: 72,
        b: 145,
      };
  }
}

/**
 * Read an image sample into a canvas.
 */
async function loadImageSample(file) {
  validateHandwritingSample(file);

  const objectUrl =
    URL.createObjectURL(file);

  try {
    const image = new Image();

    await new Promise(
      (resolve, reject) => {
        image.onload = resolve;
        image.onerror = () =>
          reject(
            new Error(
              "Unable to read the handwriting sample."
            )
          );

        image.src = objectUrl;
      }
    );

    const maxDimension = 1800;

    const ratio = Math.min(
      1,
      maxDimension /
        Math.max(
          image.naturalWidth,
          image.naturalHeight
        )
    );

    const width = Math.max(
      1,
      Math.round(
        image.naturalWidth * ratio
      )
    );

    const height = Math.max(
      1,
      Math.round(
        image.naturalHeight * ratio
      )
    );

    const canvas =
      document.createElement("canvas");

    canvas.width = width;
    canvas.height = height;

    const context =
      canvas.getContext("2d", {
        willReadFrequently: true,
      });

    if (!context) {
      throw new Error(
        "Unable to analyze the handwriting sample."
      );
    }

    context.fillStyle = "#ffffff";

    context.fillRect(
      0,
      0,
      width,
      height
    );

    context.drawImage(
      image,
      0,
      0,
      width,
      height
    );

    return canvas;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Estimate handwriting characteristics from a sample.
 *
 * This does NOT identify characters or create a true
 * handwriting font. It extracts visual characteristics
 * used by the local rendering pipeline.
 */
export async function analyzeHandwritingSample(
  file
) {
  const canvas =
    await loadImageSample(file);

  const context =
    canvas.getContext("2d", {
      willReadFrequently: true,
    });

  if (!context) {
    throw new Error(
      "Unable to analyze the handwriting sample."
    );
  }

  const imageData =
    context.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

  const pixels = imageData.data;

  let darkPixels = 0;
  let totalDarkness = 0;

  let inkRed = 0;
  let inkGreen = 0;
  let inkBlue = 0;

  let weightedX = 0;
  let weightedY = 0;
  let weightedTop = 0;
  let weightedBottom = 0;

  const width = canvas.width;
  const height = canvas.height;

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];

    const luminance =
      0.2126 * r +
      0.7152 * g +
      0.0722 * b;

    const darkness =
      Math.max(
        0,
        Math.min(
          1,
          (235 - luminance) / 190
        )
      );

    if (darkness <= 0.08) {
      continue;
    }

    const pixelPosition =
      index / 4;

    const x =
      pixelPosition % width;

    const y =
      Math.floor(
        pixelPosition / width
      );

    darkPixels += 1;

    totalDarkness += darkness;

    inkRed += r * darkness;
    inkGreen += g * darkness;
    inkBlue += b * darkness;

    weightedX +=
      x * darkness;

    weightedY +=
      y * darkness;

    weightedTop +=
      Math.max(
        0,
        1 - y / height
      ) *
      darkness;

    weightedBottom +=
      (y / height) *
      darkness;
  }

  if (darkPixels === 0) {
    canvas.width = 1;
    canvas.height = 1;

    throw new Error(
      "No handwriting strokes were detected. Please upload a clearer sample."
    );
  }

  const averageDarkness =
    totalDarkness /
    darkPixels;

  const averageR =
    inkRed /
    totalDarkness;

  const averageG =
    inkGreen /
    totalDarkness;

  const averageB =
    inkBlue /
    totalDarkness;

  const centerX =
    weightedX /
    totalDarkness;

  const centerY =
    weightedY /
    totalDarkness;

  const horizontalCenter =
    centerX /
    width;

  const verticalCenter =
    centerY /
    height;

  /*
   * A rough slant estimate derived from the weighted
   * distribution of darker pixels.
   */
  const estimatedSlant =
    Math.max(
      -8,
      Math.min(
        8,
        (horizontalCenter - 0.5) * 5
      )
    );

  const colorDistanceFromWhite =
    255 -
    (
      0.2126 * averageR +
      0.7152 * averageG +
      0.0722 * averageB
    );

  let inkColor = "blue";

  if (
    averageR >
      averageG * 1.35 &&
    averageR >
      averageB * 1.35
  ) {
    inkColor = "red";
  } else if (
    averageG >
      averageR * 1.25 &&
    averageG >
      averageB * 1.12
  ) {
    inkColor = "green";
  } else if (
    colorDistanceFromWhite < 80
  ) {
    inkColor = "black";
  } else if (
    averageB >= averageR * 1.05
  ) {
    inkColor = "blue";
  }

  const strokeWeight =
    Math.max(
      0.45,
      Math.min(
        2.4,
        0.55 +
          averageDarkness * 1.65
      )
    );

  const texture =
    Math.max(
      0.03,
      Math.min(
        0.55,
        0.08 +
          averageDarkness * 0.38
      )
    );

  const jitter =
    Math.max(
      0.03,
      Math.min(
        0.45,
        0.05 +
          Math.abs(
            verticalCenter -
              0.5
          ) *
            0.55
      )
    );

  const profile =
    normalizeCustomProfile({
      inkColor,
      inkIntensity:
        Math.max(
          0.55,
          Math.min(
            1,
            0.62 +
              averageDarkness *
                0.5
          )
        ),
      paperIntensity: 0.12,
      slant: estimatedSlant,
      texture,
      jitter,
      strokeWeight,
      softness:
        Math.max(
          0.03,
          Math.min(
            0.4,
            0.12 -
              averageDarkness *
                0.07
          )
        ),
    });

  canvas.width = 1;
  canvas.height = 1;

  return {
    ...profile,

    sampleAnalysis: {
      averageDarkness,
      averageInkColor: {
        r: Math.round(averageR),
        g: Math.round(averageG),
        b: Math.round(averageB),
      },
      strokeDensity:
        darkPixels /
        (width * height),
      estimatedSlant,
      centerX:
        Math.round(
          horizontalCenter * 100
        ) / 100,
      centerY:
        Math.round(
          verticalCenter * 100
        ) / 100,
    },
  };
}

/**
 * Prepare a custom handwriting profile from a sample.
 */
export async function createCustomHandwritingProfile(
  sampleFile
) {
  validateHandwritingSample(
    sampleFile
  );

  return analyzeHandwritingSample(
    sampleFile
  );
}

/**
 * Draw the selected paper background.
 */
function drawPaperBackground(
  context,
  width,
  height,
  paperStyle,
  paperIntensity
) {
  const alpha = Math.max(
    0,
    Math.min(1, paperIntensity)
  );

  context.save();

  context.fillStyle = "#fcfaf4";

  context.fillRect(
    0,
    0,
    width,
    height
  );

  if (paperStyle === "lined") {
    context.strokeStyle =
      `rgba(90, 135, 210, ${
        0.24 * alpha + 0.08
      })`;

    context.lineWidth = 1;

    const spacing =
      Math.max(
        28,
        Math.round(
          height / 34
        )
      );

    for (
      let y = spacing;
      y < height;
      y += spacing
    ) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  if (paperStyle === "grid") {
    context.strokeStyle =
      `rgba(100, 125, 160, ${
        0.18 * alpha + 0.06
      })`;

    context.lineWidth = 1;

    const spacing =
      Math.max(
        26,
        Math.round(
          height / 36
        )
      );

    for (
      let y = spacing;
      y < height;
      y += spacing
    ) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    for (
      let x = spacing;
      x < width;
      x += spacing
    ) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(
        x,
        height
      );
      context.stroke();
    }
  }

  if (paperStyle === "journal") {
    context.strokeStyle =
      `rgba(130, 70, 70, ${
        0.22 * alpha + 0.06
      })`;

    context.lineWidth = 1;

    const spacing =
      Math.max(
        28,
        Math.round(
          height / 34
        )
      );

    for (
      let y = spacing;
      y < height;
      y += spacing
    ) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.strokeStyle =
      `rgba(210, 75, 75, ${
        0.34 * alpha + 0.1
      })`;

    context.beginPath();

    const margin =
      Math.min(
        60,
        Math.round(
          width * 0.08
        )
      );

    context.moveTo(
      margin,
      0
    );

    context.lineTo(
      margin,
      height
    );

    context.stroke();
  }

  context.restore();
}

/**
 * Apply a subtle paper texture.
 */
function applyPaperTexture(
  context,
  width,
  height,
  textureAmount
) {
  if (textureAmount <= 0) {
    return;
  }

  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height
    );

  const pixels =
    imageData.data;

  const amount =
    Math.round(
      Math.max(
        0,
        Math.min(
          1,
          textureAmount
        )
      ) * 14
    );

  if (amount <= 0) {
    return;
  }

  for (
    let index = 0;
    index < pixels.length;
    index += 4
  ) {
    const noise =
      Math.floor(
        Math.random() *
          (amount * 2 + 1)
      ) -
      amount;

    pixels[index] =
      Math.max(
        0,
        Math.min(
          255,
          pixels[index] +
            noise
        )
      );

    pixels[index + 1] =
      Math.max(
        0,
        Math.min(
          255,
          pixels[index + 1] +
            noise
        )
      );

    pixels[index + 2] =
      Math.max(
        0,
        Math.min(
          255,
          pixels[index + 2] +
            noise
        )
      );
  }

  context.putImageData(
    imageData,
    0,
    0
  );
}

/**
 * Stylize a rendered PDF page.
 */
function stylizeAsHandwriting(
  sourceCanvas,
  options
) {
  const width =
    sourceCanvas.width;

  const height =
    sourceCanvas.height;

  const outputCanvas =
    document.createElement(
      "canvas"
    );

  outputCanvas.width =
    width;

  outputCanvas.height =
    height;

  const outputContext =
    outputCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!outputContext) {
    throw new Error(
      "Unable to create the handwriting canvas."
    );
  }

  const adjustedSlant =
    options.slant +
    options.userSlant;

  const adjustedIntensity =
    Math.max(
      0,
      Math.min(
        1.2,
        options.inkIntensity *
          options.userIntensity
      )
    );

  const adjustedTexture =
    Math.max(
      0,
      Math.min(
        1,
        options.texture +
          options.userTexture
      )
    );

  const adjustedJitter =
    Math.max(
      0,
      Math.min(
        1,
        options.jitter +
          options.userJitter
      )
    );

  outputContext.save();

  const slantRadians =
    (adjustedSlant *
      Math.PI) /
    180;

  const shear =
    Math.tan(
      slantRadians
    ) * 0.025;

  outputContext.transform(
    1,
    0,
    shear,
    1,
    -Math.abs(
      shear
    ) *
      height *
      0.08,
    0
  );

  drawPaperBackground(
    outputContext,
    width,
    height,
    options.paperStyle,
    options.paperIntensity
  );

  outputContext.restore();

  const sourceContext =
    sourceCanvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!sourceContext) {
    throw new Error(
      "Unable to read the rendered PDF page."
    );
  }

  const sourceImage =
    sourceContext.getImageData(
      0,
      0,
      width,
      height
    );

  const sourcePixels =
    sourceImage.data;

  const outputImage =
    outputContext.getImageData(
      0,
      0,
      width,
      height
    );

  const outputPixels =
    outputImage.data;

  const ink =
    getInkBaseColor(
      options.inkColor
    );

  const strokeWeight =
    options.strokeWeight;

  const softness =
    options.softness;

  for (
    let index = 0;
    index <
    sourcePixels.length;
    index += 4
  ) {
    const sourceR =
      sourcePixels[index];

    const sourceG =
      sourcePixels[index + 1];

    const sourceB =
      sourcePixels[index + 2];

    const luminance =
      0.2126 *
        sourceR +
      0.7152 *
        sourceG +
      0.0722 *
        sourceB;

    if (
      luminance >
      242
    ) {
      continue;
    }

    let inkStrength =
      (255 -
        luminance) /
      255;

    if (
      inkStrength <
      0.045
    ) {
      continue;
    }

    inkStrength =
      Math.pow(
        inkStrength,
        0.78
      );

    inkStrength *=
      adjustedIntensity;

    inkStrength *=
      0.82 +
      strokeWeight *
        0.1;

    if (softness > 0) {
      inkStrength =
        inkStrength *
        (1 -
          softness *
            0.25);
    }

    const variation =
      (
        Math.random() -
        0.5
      ) *
      adjustedJitter *
      0.08;

    inkStrength =
      Math.max(
        0,
        Math.min(
          1,
          inkStrength +
            variation
        )
      );

    const paperR =
      outputPixels[index];

    const paperG =
      outputPixels[
        index + 1
      ];

    const paperB =
      outputPixels[
        index + 2
      ];

    outputPixels[index] =
      paperR *
        (1 -
          inkStrength) +
      ink.r *
        inkStrength;

    outputPixels[
      index + 1
    ] =
      paperG *
        (1 -
          inkStrength) +
      ink.g *
        inkStrength;

    outputPixels[
      index + 2
    ] =
      paperB *
        (1 -
          inkStrength) +
      ink.b *
        inkStrength;

    outputPixels[
      index + 3
    ] = 255;
  }

  outputContext.putImageData(
    outputImage,
    0,
    0
  );

  applyPaperTexture(
    outputContext,
    width,
    height,
    adjustedTexture
  );

  return outputCanvas;
}

/**
 * Render one PDF page.
 */
async function renderPage(
  pdf,
  pageNumber,
  renderScale
) {
  const page =
    await pdf.getPage(
      pageNumber
    );

  const viewport =
    page.getViewport({
      scale: renderScale,
    });

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    Math.max(
      1,
      Math.ceil(
        viewport.width
      )
    );

  canvas.height =
    Math.max(
      1,
      Math.ceil(
        viewport.height
      )
    );

  const context =
    canvas.getContext(
      "2d",
      {
        willReadFrequently: true,
      }
    );

  if (!context) {
    throw new Error(
      "Unable to create the PDF rendering canvas."
    );
  }

  context.fillStyle =
    "#ffffff";

  context.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    canvas,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Convert a canvas to PNG bytes.
 */
async function canvasToPngBytes(
  canvas
) {
  const blob =
    await new Promise(
      (resolve, reject) => {
        canvas.toBlob(
          (value) => {
            if (value) {
              resolve(value);
            } else {
              reject(
                new Error(
                  "Unable to create the handwriting page image."
                )
              );
            }
          },
          "image/png"
        );
      }
    );

  const buffer =
    await blob.arrayBuffer();

  return new Uint8Array(
    buffer
  );
}

/**
 * Convert PDF pages into handwriting-style pages.
 */
export async function pdfToHandwriting(
  file,
  options = {},
  onProgress
) {
  validatePdfFile(file);

  const normalizedOptions =
    createPdfToHandwritingOptions(
      options
    );

  /*
   * If custom handwriting is selected, either use a supplied
   * analyzed profile or analyze the uploaded sample before
   * rendering the document.
   */
  if (
    normalizedOptions.style ===
    "custom"
  ) {
    if (
      !normalizedOptions.customSample &&
      !normalizedOptions.customProfile
    ) {
      throw new Error(
        "Please provide a handwriting sample for Your Handwriting mode."
      );
    }

    if (
      normalizedOptions.customSample &&
      normalizedOptions.customSample instanceof
        File
    ) {
      normalizedOptions.customProfile =
        await createCustomHandwritingProfile(
          normalizedOptions.customSample
        );

      Object.assign(
        normalizedOptions,
        normalizedOptions.customProfile
      );
    } else if (
      normalizedOptions.customProfile
    ) {
      Object.assign(
        normalizedOptions,
        normalizeCustomProfile(
          normalizedOptions.customProfile
        )
      );
    }
  }

  const sourcePdf =
    await loadPdfJsDocument(
      file
    );

  try {
    const totalPages =
      sourcePdf.numPages;

    if (totalPages === 0) {
      throw new Error(
        "The PDF contains no pages."
      );
    }

    const outputPdf =
      await PDFDocument.create();

    onProgress?.({
      current: 0,
      total: totalPages,
      percent: 0,
    });

    for (
      let pageNumber = 1;
      pageNumber <=
      totalPages;
      pageNumber += 1
    ) {
      const renderedPage =
        await renderPage(
          sourcePdf,
          pageNumber,
          normalizedOptions.renderScale
        );

      const handwritingCanvas =
        stylizeAsHandwriting(
          renderedPage.canvas,
          normalizedOptions
        );

      const pngBytes =
        await canvasToPngBytes(
          handwritingCanvas
        );

      const image =
        await outputPdf.embedPng(
          pngBytes
        );

      const pageWidth =
        renderedPage.width /
        normalizedOptions.renderScale;

      const pageHeight =
        renderedPage.height /
        normalizedOptions.renderScale;

      const outputPage =
        outputPdf.addPage([
          pageWidth,
          pageHeight,
        ]);

      outputPage.drawImage(
        image,
        {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        }
      );

      renderedPage.canvas.width = 1;
      renderedPage.canvas.height = 1;

      handwritingCanvas.width = 1;
      handwritingCanvas.height = 1;

      onProgress?.({
        current: pageNumber,
        total: totalPages,
        percent: Math.round(
          (pageNumber /
            totalPages) *
            100
        ),
      });
    }

    const outputBytes =
      await outputPdf.save();

    if (
      !outputBytes ||
      outputBytes.length === 0
    ) {
      throw new Error(
        "Failed to generate the handwriting PDF."
      );
    }

    return new Blob(
      [outputBytes],
      {
        type: "application/pdf",
      }
    );
  } finally {
    await cleanupPdfDocument(
      sourcePdf
    );
  }
}