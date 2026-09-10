import { useState } from "react";
import ImageUploader from "../../components/ImageUploader";
import RadialGlowButton from "../../components/RadialGlowButton";
import { convertImage as convertImageService } from "../../services/image/convertImage";

function ConvertImage({ onBack }) {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("image/png");
  const [quality, setQuality] = useState(0.9);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleFileSelected = (selectedFile) => {
    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      setStatus("idle");
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setFile(null);
      setStatus("error");
      setError("Please select a valid image file.");
      return;
    }

    setFile(selectedFile);
    setStatus("ready");
  };

  const handleReset = () => {
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }

    setFile(null);
    setResult(null);
    setError("");
    setStatus("idle");
    setFormat("image/png");
    setQuality(0.9);
  };

  const handleConvert = async () => {
    if (!file || status === "processing") return;

    try {
      setError("");
      setResult(null);
      setStatus("processing");

      const convertedFile = await convertImageService(
        file,
        format,
        quality
      );

      const url = URL.createObjectURL(convertedFile);

      setResult({
        file: convertedFile,
        url,
      });

      setStatus("success");
    } catch (err) {
      console.error(err);

      setError(
        err?.message || "Unable to convert this image. Please try again."
      );

      setStatus("error");
    }
  };

  const handleDownload = () => {
    if (!result?.url || !result?.file) return;

    const link = document.createElement("a");
    link.href = result.url;
    link.download = result.file.name;

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    );

    return `${(bytes / 1024 ** index).toFixed(
      index === 0 ? 0 : 1
    )} ${units[index]}`;
  };

  return (
    <div className="tool-workspace">
      {!file && status !== "error" && (
        <ImageUploader onFileSelected={handleFileSelected} />
      )}

      {status === "error" && !file && (
        <div className="tool-error">
          <strong>Unable to continue</strong>
          <p>{error}</p>

          <button
            type="button"
            className="secondary-button"
            onClick={handleReset}
          >
            Try Again
          </button>
        </div>
      )}

      {file && status !== "success" && (
        <div className="tool-panel">
          <div className="file-card">
            <div className="file-card-info">
              <div className="file-icon">IMG</div>

              <div className="file-details">
                <span className="file-name" title={file.name}>
                  {file.name}
                </span>

                <span className="file-size">
                  {formatFileSize(file.size)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="file-remove"
              onClick={handleReset}
              disabled={status === "processing"}
              aria-label="Remove selected image"
            >
              ×
            </button>
          </div>

          <div className="tool-section">
            <div className="section-label">OUTPUT</div>

            <label className="control-label" htmlFor="image-format">
              Output format
            </label>

            <select
              id="image-format"
              className="tool-select"
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              disabled={status === "processing"}
            >
              <option value="image/png">PNG</option>
              <option value="image/jpeg">JPG</option>
              <option value="image/webp">WebP</option>
            </select>
          </div>

          {format !== "image/png" && (
            <div className="tool-section">
              <div className="section-label">QUALITY</div>

              <div className="quality-header">
                <label
                  className="control-label"
                  htmlFor="image-quality"
                >
                  Compression quality
                </label>

                <span className="quality-value">
                  {Math.round(quality * 100)}%
                </span>
              </div>

              <input
                id="image-quality"
                className="tool-range"
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(event) =>
                  setQuality(Number(event.target.value))
                }
                disabled={status === "processing"}
              />
            </div>
          )}

          {error && (
            <div className="tool-error">
              <strong>Conversion failed</strong>
              <p>{error}</p>
            </div>
          )}

          {status === "processing" ? (
            <div className="tool-processing">
              <div className="processing-header">
                <span>Converting image</span>
                <span>Processing...</span>
              </div>

              <div className="processing-bar">
                <div className="processing-indeterminate" />
              </div>

              <p>
                Your image is being processed locally on your device.
              </p>
            </div>
          ) : (
            <div className="tool-actions">
              <RadialGlowButton onClick={handleConvert}>
                Convert &amp; Download
              </RadialGlowButton>

              <button
                type="button"
                className="secondary-button"
                onClick={handleReset}
              >
                Choose another image
              </button>
            </div>
          )}
        </div>
      )}

      {status === "success" && result && (
        <div className="tool-panel success-panel">
          <div className="success-icon">✓</div>

          <div className="success-content">
            <div className="section-label">COMPLETE</div>

            <h3>Image converted successfully</h3>

            <p className="result-name" title={result.file.name}>
              {result.file.name}
            </p>

            <p className="result-size">
              {formatFileSize(result.file.size)}
            </p>
          </div>

          <div className="tool-actions">
            <RadialGlowButton onClick={handleDownload}>
              Download Image
            </RadialGlowButton>

            <button
              type="button"
              className="secondary-button"
              onClick={handleReset}
            >
              Convert another image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConvertImage;