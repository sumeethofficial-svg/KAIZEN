export async function convertImage(file, format = "image/png", quality = 0.9) {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid image file.");
  }

  const image = new Image();

  const objectUrl = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("Failed to load the image."));
      image.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not create a canvas context.");
    }

    ctx.drawImage(image, 0, 0);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Image conversion failed."));
          }
        },
        format,
        quality
      );
    });

    const extension = format.split("/")[1];

    return new File(
      [blob],
      `${file.name.replace(/\.[^/.]+$/, "")}.${extension}`,
      {
        type: format,
      }
    );
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}