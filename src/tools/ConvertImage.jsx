import { useState } from "react";
import ImageUploader from "../components/ImageUploader";
import RadialGlowButton from "../components/RadialGlowButton";

function ConvertImage({ onBack }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("image/png");

  const convertImage = () => {
    if (!file) return;

    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");

      canvas.width = image.width;
      canvas.height = image.height;

      const context = canvas.getContext("2d");

      context.drawImage(image, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;
        link.download = `converted-image.${format.split("/")[1]}`;

        link.click();

        URL.revokeObjectURL(url);
      }, format);
    };

    image.src = URL.createObjectURL(file);
  };

  return (
    <div className="tool-page">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="tool-header">
        <h2>Convert Image</h2>
        <p>Convert your image to another format.</p>
      </div>

      {!file ? (
        <ImageUploader onFileSelected={setFile} />
      ) : (
        <div className="tool-panel">
          <p className="file-name">{file.name}</p>

          <label>
            Output format
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
            </select>
          </label>

          <RadialGlowButton onClick={convertImage}>
          Convert & Download
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

export default ConvertImage;