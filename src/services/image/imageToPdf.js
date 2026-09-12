import { PDFDocument } from "pdf-lib";

const PAGE_SIZES = {
  A4: {
    width: 595.28,
    height: 841.89,
  },

  Letter: {
    width: 612,
    height: 792,
  },
};

const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);

      reject(
        new Error(
          `Unable to load "${file.name}".`
        )
      );
    };

    image.src = url;
  });
};

const imageToPngBytes = async (file) => {
  const image = await loadImage(file);

  const canvas =
    document.createElement("canvas");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to process the image."
    );
  }

  /*
   * White background prevents transparency
   * from becoming black in the PDF.
   */
  ctx.fillStyle = "#ffffff";

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  ctx.drawImage(
    image,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(
              new Error(
                `Unable to convert "${file.name}".`
              )
            );
          }
        },
        "image/png"
      );
    }
  );

  return new Uint8Array(
    await blob.arrayBuffer()
  );
};

const getImageDimensions = async (
  file
) => {
  const image = await loadImage(file);

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
};

const getPageDimensions = (
  pageSize,
  orientation,
  imageWidth,
  imageHeight
) => {
  if (pageSize === "Original") {
    if (
      orientation === "Landscape" ||
      (
        orientation === "Auto" &&
        imageWidth > imageHeight
      )
    ) {
      return {
        width: imageWidth,
        height: imageHeight,
      };
    }

    return {
      width: imageWidth,
      height: imageHeight,
    };
  }

  const base =
    PAGE_SIZES[pageSize] ||
    PAGE_SIZES.A4;

  if (orientation === "Landscape") {
    return {
      width: Math.max(
        base.width,
        base.height
      ),
      height: Math.min(
        base.width,
        base.height
      ),
    };
  }

  if (orientation === "Portrait") {
    return {
      width: Math.min(
        base.width,
        base.height
      ),
      height: Math.max(
        base.width,
        base.height
      ),
    };
  }

  /*
   * Auto orientation follows the image.
   */
  if (imageWidth > imageHeight) {
    return {
      width: Math.max(
        base.width,
        base.height
      ),
      height: Math.min(
        base.width,
        base.height
      ),
    };
  }

  return {
    width: Math.min(
      base.width,
      base.height
    ),
    height: Math.max(
      base.width,
      base.height
    ),
  };
};

const calculateContainDimensions = (
  imageWidth,
  imageHeight,
  availableWidth,
  availableHeight
) => {
  const scale = Math.min(
    availableWidth / imageWidth,
    availableHeight / imageHeight
  );

  return {
    width: imageWidth * scale,
    height: imageHeight * scale,
  };
};

const getFileType = (file) => {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/jpg"
  ) {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  return "other";
};

const embedImage = async (
  pdfDoc,
  file
) => {
  const type = getFileType(file);

  if (type === "jpg") {
    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    return pdfDoc.embedJpg(bytes);
  }

  if (type === "png") {
    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    return pdfDoc.embedPng(bytes);
  }

  /*
   * WebP / AVIF and other browser-readable
   * image formats are converted to PNG.
   */
  const pngBytes =
    await imageToPngBytes(file);

  return pdfDoc.embedPng(pngBytes);
};

export const createImagePdf = async ({
  files,
  pageSize = "A4",
  orientation = "Auto",
  margin = 20,
}) => {
  if (!files || files.length === 0) {
    throw new Error(
      "Please add at least one image."
    );
  }

  const pdfDoc =
    await PDFDocument.create();

  for (const file of files) {
    const imageDimensions =
      await getImageDimensions(file);

    const pageDimensions =
      getPageDimensions(
        pageSize,
        orientation,
        imageDimensions.width,
        imageDimensions.height
      );

    const page =
      pdfDoc.addPage([
        pageDimensions.width,
        pageDimensions.height,
      ]);

    const embeddedImage =
      await embedImage(
        pdfDoc,
        file
      );

    const safeMargin = Math.min(
      Number(margin) || 0,
      pageDimensions.width / 2 - 1,
      pageDimensions.height / 2 - 1
    );

    const availableWidth =
      pageDimensions.width -
      safeMargin * 2;

    const availableHeight =
      pageDimensions.height -
      safeMargin * 2;

    const displayDimensions =
      calculateContainDimensions(
        imageDimensions.width,
        imageDimensions.height,
        availableWidth,
        availableHeight
      );

    const x =
      (pageDimensions.width -
        displayDimensions.width) /
      2;

    const y =
      (pageDimensions.height -
        displayDimensions.height) /
      2;

    page.drawImage(
      embeddedImage,
      {
        x,
        y,
        width:
          displayDimensions.width,
        height:
          displayDimensions.height,
      }
    );
  }

  const pdfBytes =
    await pdfDoc.save();

  return new Blob(
    [pdfBytes],
    {
      type: "application/pdf",
    }
  );
};

export const getSupportedImageTypes =
  () => {
    return [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/avif",
    ];
  };