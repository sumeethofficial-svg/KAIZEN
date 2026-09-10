import { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import RadialGlowButton from "../components/RadialGlowButton";

function CompressImage({ onBack }) {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState(70);

  const compressImage = () => {
    if (!file) return;

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");

      context.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          const url = URL.createObjectURL(blob);

          const link = document.createElement("a");

          link.href = url;
          link.download = "compressed-image.jpg";

          link.click();

          URL.revokeObjectURL(url);
        },
        "image/jpeg",
        quality / 100
      );
    };

    image.src = URL.createObjectURL(file);
  };

  return (
    <div className="tool-page">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="tool-header">
        <h2>Compress Image</h2>
        <p>Reduce the file size of your image.</p>
      </div>

      {!file ? (
        <ImageUploader onFileSelected={setFile} />
      ) : (
        <div className="tool-panel">
          <p className="file-name">{file.name}</p>

          <div className="range-container">
            <div className="range-label">
              <span>Quality</span>
              <strong>{quality}%</strong>
            </div>

            <input
              type="range"
              min="10"
              max="100"
              value={quality}
              onChange={(event) =>
                setQuality(Number(event.target.value))
              }
            />
          </div>

          <RadialGlowButton onClick={compressImage}>
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

export default CompressImage;