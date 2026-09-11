import { PptxRenderer } from "pptx-svg";
import { jsPDF } from "jspdf";

/**
 * PowerPoint -> PDF
 *
 * Current supported input:
 * - .pptx
 *
 * The PPTX is rendered locally in the browser with pptx-svg.
 * Each slide is converted to an SVG, rasterized to a canvas,
 * then placed into a PDF page.
 */

const SUPPORTED_EXTENSIONS = [".pptx"];

const PAGE_SIZES_MM = {
  A4: {
    portrait: [210, 297],
    landscape: [297, 210],
  },

  A3: {
    portrait: [297, 420],
    landscape: [420, 297],
  },

  Letter: {
    portrait: [215.9, 279.4],
    landscape: [279.4, 215.9],
  },

  Legal: {
    portrait: [215.9, 355.6],
    landscape: [355.6, 215.9],
  },
};

function getFileExtension(fileName) {
  const lastDot = fileName.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return fileName.slice(lastDot).toLowerCase();
}

function isSupportedPowerPointFile(file) {
  if (!(file instanceof File)) {
    return false;
  }

  return SUPPORTED_EXTENSIONS.includes(
    getFileExtension(file.name),
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseSvgDimensions(svgString) {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    svgString,
    "image/svg+xml",
  );

  const svg = document.documentElement;

  const widthAttribute = svg.getAttribute("width");
  const heightAttribute = svg.getAttribute("height");
  const viewBoxAttribute = svg.getAttribute("viewBox");

  let width = Number.parseFloat(widthAttribute);
  let height = Number.parseFloat(heightAttribute);

  if (
    (!Number.isFinite(width) || !Number.isFinite(height)) &&
    viewBoxAttribute
  ) {
    const parts = viewBoxAttribute
      .trim()
      .split(/[\s,]+/)
      .map(Number);

    if (parts.length === 4) {
      width = parts[2];
      height = parts[3];
    }
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      "Unable to determine the PowerPoint slide dimensions.",
    );
  }

  return {
    width,
    height,
  };
}

function createSvgBlobUrl(svgString) {
  const blob = new Blob(
    [svgString],
    {
      type: "image/svg+xml;charset=utf-8",
    },
  );

  return URL.createObjectURL(blob);
}

async function loadSvgImage(svgString) {
  const url = createSvgBlobUrl(svgString);

  try {
    const image = new Image();

    image.decoding = "async";

    await new Promise((resolve, reject) => {
      image.onload = resolve;

      image.onerror = () => {
        reject(
          new Error(
            "A PowerPoint slide could not be rendered as an image.",
          ),
        );
      };

      image.src = url;
    });

    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function rasterizeSvgToPng(svgString, qualityScale = 2) {
  return new Promise(async (resolve, reject) => {
    try {
      const dimensions = parseSvgDimensions(svgString);

      const image = await loadSvgImage(svgString);

      const safeScale = Math.min(
        3,
        Math.max(1, Number(qualityScale) || 2),
      );

      const canvas = document.createElement("canvas");

      canvas.width = Math.max(
        1,
        Math.round(dimensions.width * safeScale),
      );

      canvas.height = Math.max(
        1,
        Math.round(dimensions.height * safeScale),
      );

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error(
          "Your browser does not support the canvas required for PowerPoint conversion.",
        );
      }

      context.setTransform(
        safeScale,
        0,
        0,
        safeScale,
        0,
        0,
      );

      context.fillStyle = "#ffffff";
      context.fillRect(
        0,
        0,
        dimensions.width,
        dimensions.height,
      );

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      context.drawImage(
        image,
        0,
        0,
        dimensions.width,
        dimensions.height,
      );

      const pngDataUrl = canvas.toDataURL(
        "image/png",
      );

      resolve({
        dataUrl: pngDataUrl,
        width: dimensions.width,
        height: dimensions.height,
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getSlideOrientation(width, height) {
  return width >= height
    ? "landscape"
    : "portrait";
}

function getPageDimensions(pageSize, orientation) {
  const size =
    PAGE_SIZES_MM[pageSize] ||
    PAGE_SIZES_MM.A4;

  return orientation === "landscape"
    ? size.landscape
    : size.portrait;
}

function fitInsidePage(
  contentWidth,
  contentHeight,
  pageWidth,
  pageHeight,
  margin,
) {
  const availableWidth =
    pageWidth - margin * 2;

  const availableHeight =
    pageHeight - margin * 2;

  const scale = Math.min(
    availableWidth / contentWidth,
    availableHeight / contentHeight,
  );

  const width = contentWidth * scale;
  const height = contentHeight * scale;

  const x =
    (pageWidth - width) / 2;

  const y =
    (pageHeight - height) / 2;

  return {
    x,
    y,
    width,
    height,
  };
}

/**
 * Reads a PPTX and returns basic presentation information.
 */
export async function getPowerPointToPdfInfo(file) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid PowerPoint file.",
    );
  }

  if (!isSupportedPowerPointFile(file)) {
    throw new Error(
      "Only .pptx PowerPoint files are supported.",
    );
  }

  const arrayBuffer = await file.arrayBuffer();

  const renderer = new PptxRenderer({
    logLevel: "error",
  });

  try {
    await renderer.init();

    const result =
      await renderer.loadPptx(arrayBuffer);

    const slideCount =
      Number(result?.slideCount) ||
      renderer.getSlideCount();

    let hiddenSlides = 0;

    for (
      let index = 0;
      index < slideCount;
      index += 1
    ) {
      if (renderer.isSlideHidden(index)) {
        hiddenSlides += 1;
      }
    }

    return {
      name: file.name,
      size: file.size,
      sizeLabel: formatFileSize(file.size),
      extension: getFileExtension(file.name),
      slideCount,
      hiddenSlides,
      visibleSlides:
        slideCount - hiddenSlides,
    };
  } catch (error) {
    console.error(
      "PowerPoint inspection error:",
      error,
    );

    throw new Error(
      error?.message ||
        "This PowerPoint presentation could not be opened.",
    );
  }
}

/**
 * Converts a PPTX presentation to PDF.
 *
 * options:
 * - pageSize:
 *      A4 | A3 | Letter | Legal
 *
 * - orientation:
 *      auto | portrait | landscape
 *
 * - margin:
 *      PDF margin in mm
 *
 * - quality:
 *      1 | 1.5 | 2 | 2.5 | 3
 *
 * - includeHiddenSlides:
 *      boolean
 */
export async function powerpointToPdf(
  file,
  options = {},
  onProgress,
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid PowerPoint file.",
    );
  }

  if (!isSupportedPowerPointFile(file)) {
    throw new Error(
      "Only .pptx PowerPoint files are supported.",
    );
  }

  const {
    pageSize = "A4",
    orientation = "auto",
    margin = 8,
    quality = 2,
    includeHiddenSlides = false,
  } = options;

  const safeMargin = Math.min(
    25,
    Math.max(0, Number(margin) || 8),
  );

  const safeQuality = Math.min(
    3,
    Math.max(1, Number(quality) || 2),
  );

  const arrayBuffer = await file.arrayBuffer();

  onProgress?.({
    stage: "loading",
    progress: 5,
    message:
      "Loading PowerPoint presentation...",
  });

  const renderer = new PptxRenderer({
    logLevel: "error",
  });

  try {
    await renderer.init();

    const result =
      await renderer.loadPptx(arrayBuffer);

    const slideCount =
      Number(result?.slideCount) ||
      renderer.getSlideCount();

    if (!slideCount) {
      throw new Error(
        "The PowerPoint presentation does not contain any slides.",
      );
    }

    const slideIndexes = [];

    for (
      let index = 0;
      index < slideCount;
      index += 1
    ) {
      const hidden =
        renderer.isSlideHidden(index);

      if (
        !hidden ||
        includeHiddenSlides
      ) {
        slideIndexes.push(index);
      }
    }

    if (slideIndexes.length === 0) {
      throw new Error(
        "The presentation only contains hidden slides.",
      );
    }

    onProgress?.({
      stage: "processing",
      progress: 10,
      message: `Preparing ${slideIndexes.length} slides...`,
    });

    let pdf = null;

    for (
      let outputIndex = 0;
      outputIndex < slideIndexes.length;
      outputIndex += 1
    ) {
      const slideIndex =
        slideIndexes[outputIndex];

      const svgString =
        renderer.renderSlideSvg(slideIndex);

      if (
        typeof svgString !== "string" ||
        !svgString.trim()
      ) {
        throw new Error(
          `Slide ${slideIndex + 1} could not be rendered.`,
        );
      }

      const rasterized =
        await rasterizeSvgToPng(
          svgString,
          safeQuality,
        );

      const slideOrientation =
        getSlideOrientation(
          rasterized.width,
          rasterized.height,
        );

      let selectedOrientation =
        slideOrientation;

      if (orientation === "portrait") {
        selectedOrientation = "portrait";
      }

      if (orientation === "landscape") {
        selectedOrientation = "landscape";
      }

      const [pageWidth, pageHeight] =
        getPageDimensions(
          pageSize,
          selectedOrientation,
        );

      if (!pdf) {
        pdf = new jsPDF({
          orientation:
            selectedOrientation,
          unit: "mm",
          format:
            PAGE_SIZES_MM[pageSize]
              ? pageSize.toLowerCase()
              : "a4",
          compress: true,
        });

        /*
         * jsPDF accepts named formats, but "Letter"
         * and "Legal" should retain their intended
         * orientation through the constructor.
         */
        if (
          pageSize === "Letter" ||
          pageSize === "Legal"
        ) {
          pdf.deletePage(1);

          pdf = new jsPDF({
            orientation:
              selectedOrientation,
            unit: "mm",
            format: pageSize.toLowerCase(),
            compress: true,
          });
        }
      } else {
        pdf.addPage(
          [
            pageWidth,
            pageHeight,
          ],
          selectedOrientation,
        );
      }

      const placement =
        fitInsidePage(
          rasterized.width,
          rasterized.height,
          pageWidth,
          pageHeight,
          safeMargin,
        );

      pdf.addImage(
        rasterized.dataUrl,
        "PNG",
        placement.x,
        placement.y,
        placement.width,
        placement.height,
        undefined,
        "FAST",
      );

      const progress =
        10 +
        ((outputIndex + 1) /
          slideIndexes.length) *
          82;

      onProgress?.({
        stage: "processing",
        progress: Math.round(progress),
        message: `Processing slide ${outputIndex + 1} of ${slideIndexes.length}...`,
      });

      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    }

    if (!pdf) {
      throw new Error(
        "Unable to create the PDF document.",
      );
    }

    onProgress?.({
      stage: "finalizing",
      progress: 96,
      message:
        "Finalizing PowerPoint PDF...",
    });

    const baseName = file.name.replace(
      /\.pptx$/i,
      "",
    );

    const outputFileName =
      `${baseName}.pdf`;

    const blob = pdf.output("blob");

    onProgress?.({
      stage: "complete",
      progress: 100,
      message:
        "PowerPoint converted successfully.",
    });

    return {
      blob,
      fileName: outputFileName,
      slideCount: slideIndexes.length,
      originalSlideCount: slideCount,
      size: blob.size,
    };
  } catch (error) {
    console.error(
      "PowerPoint to PDF conversion error:",
      error,
    );

    throw new Error(
      error?.message ||
        "The PowerPoint presentation could not be converted to PDF.",
    );
  }
}

export default {
  getPowerPointToPdfInfo,
  powerpointToPdf,
};