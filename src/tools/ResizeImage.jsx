import { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import RadialGlowButton from "../components/RadialGlowButton";

function ResizeImage({ onBack }) {
  const [file, setFile] = useState(null);
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(1000);

  const resizeImage = () => {
    if (!file) return;

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");

      context.drawImage(
        image,
        0,
        0,
        width,
        height
      );

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = "resized-image.jpg";

        link.click();

        URL.revokeObjectURL(url);
      }, "image/jpeg");
    };

    image.src = URL.createObjectURL(file);
  };

  return (
    <div className="tool-page">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="tool-header">
        <h2>Resize Image</h2>
        <p>Change the dimensions of your image.</p>
      </div>

      {!file ? (
        <ImageUploader onFileSelected={setFile} />
      ) : (
        <div className="tool-panel">
          <p className="file-name">{file.name}</p>

          <div className="dimension-grid">
            <label>
              Width
              <input
                type="number"
                value={width}
                onChange={(event) =>
                  setWidth(Number(event.target.value))
                }
              />
            </label>

            <label>
              Height
              <input
                type="number"
                value={height}
                onChange={(event) =>
                  setHeight(Number(event.target.value))
                }
              />
            </label>
          </div>

          <RadialGlowButton onClick={resizeImage}>
          Resize & Download
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

export default ResizeImage;