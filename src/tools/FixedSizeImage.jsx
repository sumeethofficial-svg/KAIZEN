import { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import RadialGlowButton from "../components/RadialGlowButton";

function FixedSizeImage({ onBack }) {
  const [file, setFile] = useState(null);
  const [targetSize, setTargetSize] = useState(500);

  const compressToSize = () => {
    if (!file) return;

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");

      context.drawImage(image, 0, 0);

      let quality = 0.9;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) return;

            const sizeInKB = blob.size / 1024;

            if (sizeInKB <= targetSize || quality <= 0.1) {
              const url = URL.createObjectURL(blob);

              const link = document.createElement("a");

              link.href = url;
              link.download = "compressed-image.jpg";

              link.click();

              URL.revokeObjectURL(url);

              return;
            }

            quality -= 0.05;

            tryCompress();
          },
          "image/jpeg",
          quality
        );
      };

      tryCompress();
    };

    image.src = URL.createObjectURL(file);
  };

  return (
    <div className="tool-page">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="tool-header">
        <h2>Compress to Fixed Size</h2>
        <p>Try to compress the image below your target size.</p>
      </div>

      {!file ? (
        <ImageUploader onFileSelected={setFile} />
      ) : (
        <div className="tool-panel">
          <p className="file-name">{file.name}</p>

          <label>
            Target size (KB)

            <input
              type="number"
              min="10"
              value={targetSize}
              onChange={(event) =>
                setTargetSize(Number(event.target.value))
              }
            />
          </label>

          <RadialGlowButton onClick={compressToSize}>
          Compress & Download
          </RadialGlowButton>

          <button
            className="secondary-button"
            onClick={() => setFile(null)}
          >
            Choose another image
          </button>
        </div>
      )}
    </div>
  );
}

export default FixedSizeImage;