export const adjustImageColors = (
  image,
  {
    brightness = 0,
    contrast = 0,
    saturation = 0,
    exposure = 0,
    hue = 0,
    blur = 0,
    grayscale = 0,
    sepia = 0,
  } = {}
) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const exposureValue = Math.pow(2, exposure / 100);

  const contrastFactor =
    (259 * (contrast + 255)) /
    (255 * (259 - contrast));

  ctx.filter = `
    brightness(${100 + brightness * 0.5}%)
    contrast(${contrastFactor * 100}%)
    saturate(${100 + saturation}%)
    hue-rotate(${hue}deg)
    blur(${blur}px)
    grayscale(${grayscale}%)
    sepia(${sepia}%)
  `;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  ctx.filter = "none";

  if (exposure !== 0) {
    const imageData = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, data[i] * exposureValue);
      data[i + 1] = Math.min(255, data[i + 1] * exposureValue);
      data[i + 2] = Math.min(255, data[i + 2] * exposureValue);
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return canvas;
};

export const downloadAdjustedImage = (
  canvas,
  format = "png"
) => {
  const mimeType =
    format === "jpg"
      ? "image/jpeg"
      : `image/${format}`;

  const extension = format === "jpg" ? "jpg" : format;

  const link = document.createElement("a");

  link.download = `kaizen-color-adjusted.${extension}`;
  link.href = canvas.toDataURL(mimeType, 0.95);

  link.click();
};