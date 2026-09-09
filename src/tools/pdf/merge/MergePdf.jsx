import { useEffect, useState } from "react";

import FileDropzone from "../../../components/files/FileDropzone";
import FileList from "../../../components/files/FileList";

import { mergePdfFiles } from "../../../services/pdf/mergePdf";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MergePdf() {
  const [files, setFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result]);

  function handleFilesSelected(selectedFiles) {
    const pdfFiles = selectedFiles.filter(
      (file) =>
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length === 0) {
      setError("Please select valid PDF files.");
      return;
    }

    setFiles((currentFiles) => [
      ...currentFiles,
      ...pdfFiles,
    ]);

    setError("");
    setResult(null);
  }

  function removeFile(index) {
    setFiles((currentFiles) =>
      currentFiles.filter(
        (_, fileIndex) => fileIndex !== index
      )
    );

    setResult(null);
    setError("");
  }

  function moveFile(index, direction) {
    setFiles((currentFiles) => {
      const newFiles = [...currentFiles];
      const targetIndex = index + direction;

      if (
        targetIndex < 0 ||
        targetIndex >= newFiles.length
      ) {
        return currentFiles;
      }

      [newFiles[index], newFiles[targetIndex]] = [
        newFiles[targetIndex],
        newFiles[index],
      ];

      return newFiles;
    });

    setResult(null);
  }

  async function handleMerge() {
    if (files.length < 2) {
      setError("Add at least two PDF files to merge.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setResult(null);

    try {
      const mergedBlob = await mergePdfFiles(files);
      const url = URL.createObjectURL(mergedBlob);

      setResult({
        url,
        filename: "merged.pdf",
        size: mergedBlob.size,
      });
    } catch (mergeError) {
      console.error(mergeError);

      setError(
        "We couldn't merge these PDFs. One of the files may be damaged or unsupported."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function handleDownload() {
    if (!result?.url) {
      return;
    }

    const link = document.createElement("a");

    link.href = result.url;
    link.download = result.filename;

    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function handleReset() {
    if (result?.url) {
      URL.revokeObjectURL(result.url);
    }

    setFiles([]);
    setResult(null);
    setError("");
    setIsProcessing(false);
  }

  return (
    <div className="merge-pdf-tool">
      <div className="merge-pdf-header">
        <div>
          <span className="merge-pdf-eyebrow">
            PDF · PAGE MANAGEMENT
          </span>

          <h2>Merge PDF</h2>

          <p>
            Combine multiple PDF files into one document in the
            order you choose.
          </p>
        </div>

        <FileDropzone
          accept="application/pdf,.pdf"
          multiple
          onFiles={handleFilesSelected}
          className="merge-pdf-add-button"
        >
          Add PDFs
        </FileDropzone>
      </div>

      <FileDropzone
        accept="application/pdf,.pdf"
        multiple
        onFiles={handleFilesSelected}
        className="merge-pdf-dropzone"
      >
        <span className="merge-pdf-drop-icon">
          +
        </span>

        <strong>Choose PDF files</strong>

        <span>
          Select multiple PDFs to combine them into a single
          document.
        </span>
      </FileDropzone>

      {error && (
        <div className="merge-pdf-error">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="merge-pdf-file-section">
          <div className="merge-pdf-section-heading">
            <div>
              <span>FILES</span>

              <strong>
                {files.length}{" "}
                {files.length === 1
                  ? "PDF"
                  : "PDFs"}{" "}
                selected
              </strong>
            </div>

            <button
              type="button"
              onClick={handleReset}
            >
              Clear all
            </button>
          </div>

          <FileList
            files={files}
            onMoveUp={(index) =>
              moveFile(index, -1)
            }
            onMoveDown={(index) =>
              moveFile(index, 1)
            }
            onRemove={removeFile}
          />
        </div>
      )}

      <div className="merge-pdf-footer">
        <div className="merge-pdf-status">
          {files.length === 0 &&
            "No files selected"}

          {files.length === 1 &&
            "Add one more PDF to continue"}

          {files.length >= 2 &&
            `${files.length} PDFs ready to merge`}
        </div>

        <button
          type="button"
          className="merge-pdf-action"
          onClick={handleMerge}
          disabled={
            files.length < 2 ||
            isProcessing
          }
        >
          {isProcessing
            ? "Merging..."
            : "Merge PDFs"}
        </button>
      </div>

      {result && (
        <div className="merge-pdf-result">
          <div>
            <span className="merge-pdf-result-label">
              COMPLETE
            </span>

            <h3>
              Your merged PDF is ready.
            </h3>

            <p>
              {result.filename} ·{" "}
              {formatFileSize(result.size)}
            </p>
          </div>

          <div className="merge-pdf-result-actions">
            <button
              type="button"
              onClick={handleDownload}
            >
              Download PDF
            </button>

            <button
              type="button"
              onClick={handleReset}
            >
              Start again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MergePdf;