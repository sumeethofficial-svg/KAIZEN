import { useEffect, useMemo, useState } from "react";
import {
  getHandwritingToPdfInfo,
  handwritingToPdf,
} from "../../../services/pdf/handwritingToPdf.js";

function HandwritingToPdf() {
  const [files, setFiles] = useState([]);
  const [fileInfo, setFileInfo] = useState(null);

  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] =
    useState("portrait");
  const [margin, setMargin] = useState(36);
  const [fit, setFit] = useState("contain");
  const [alignment, setAlignment] =
    useState("center");
  const [verticalAlignment, setVerticalAlignment] =
    useState("center");
  const [rotation, setRotation] = useState(0);
  const [imageQuality, setImageQuality] =
    useState(0.92);

  const [dragActive, setDragActive] =
    useState(false);

  const [status, setStatus] =
    useState("idle");
  const [progress, setProgress] =
    useState(0);
  const [error, setError] =
    useState("");

  const [resultUrl, setResultUrl] =
    useState("");
  const [resultName, setResultName] =
    useState("");

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  const totalSize = useMemo(
    () =>
      files.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    [files]
  );

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  async function addFiles(
    selectedFiles
  ) {
    if (!selectedFiles?.length) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      const incoming = Array.from(
        selectedFiles
      );

      const uniqueFiles = [
        ...files,
        ...incoming,
      ].filter(
        (file, index, array) =>
          array.findIndex(
            (item) =>
              item.name ===
                file.name &&
              item.size ===
                file.size &&
              item.lastModified ===
                file.lastModified
          ) === index
      );

      const info =
        await getHandwritingToPdfInfo(
          uniqueFiles
        );

      if (!info?.fileCount) {
        throw new Error(
          "No valid handwriting images were found."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFiles(uniqueFiles);
      setFileInfo(info);
      setResultUrl("");
      setResultName("");
      setProgress(0);
      setError("");
      setStatus("ready");
    } catch (err) {
      setStatus("error");

      setError(
        err?.message ||
          "Unable to read the handwriting images."
      );
    }
  }

  function handleFileInput(
    event
  ) {
    addFiles(
      event.target.files
    );

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    addFiles(
      event.dataTransfer.files
    );
  }

  function removeFile(index) {
    const nextFiles =
      files.filter(
        (_, fileIndex) =>
          fileIndex !== index
      );

    if (
      nextFiles.length === 0
    ) {
      setFiles([]);
      setFileInfo(null);
      setStatus("idle");
      setError("");
      return;
    }

    refreshFileInfo(
      nextFiles
    );
  }

  async function refreshFileInfo(
    nextFiles
  ) {
    try {
      const info =
        await getHandwritingToPdfInfo(
          nextFiles
        );

      setFiles(nextFiles);
      setFileInfo(info);
      setStatus("ready");
      setError("");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Unable to update the handwriting images."
      );
    }
  }

  function moveFileUp(index) {
    if (index <= 0) {
      return;
    }

    const nextFiles = [
      ...files,
    ];

    [
      nextFiles[index - 1],
      nextFiles[index],
    ] = [
      nextFiles[index],
      nextFiles[index - 1],
    ];

    setFiles(nextFiles);
  }

  function moveFileDown(index) {
    if (
      index >=
      files.length - 1
    ) {
      return;
    }

    const nextFiles = [
      ...files,
    ];

    [
      nextFiles[index],
      nextFiles[index + 1],
    ] = [
      nextFiles[index + 1],
      nextFiles[index],
    ];

    setFiles(nextFiles);
  }

  function removeAllFiles() {
    setFiles([]);
    setFileInfo(null);
    setStatus("idle");
    setProgress(0);
    setError("");

    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setResultUrl("");
    setResultName("");
  }

  function resetTool() {
    removeAllFiles();

    setPageSize("A4");
    setOrientation("portrait");
    setMargin(36);
    setFit("contain");
    setAlignment("center");
    setVerticalAlignment("center");
    setRotation(0);
    setImageQuality(0.92);
  }

  async function handleCreatePdf() {
    if (!files.length) {
      setError(
        "Please add at least one handwriting image."
      );
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await handwritingToPdf(
          files,
          {
            pageSize,
            orientation,
            margin,
            fit,
            alignment,
            verticalAlignment,
            rotation,
            imageQuality,
            background: true,
            backgroundColor:
              "#ffffff",
          },
          ({ percent }) => {
            setProgress(percent);
          }
        );

      if (
        !(blob instanceof Blob) ||
        blob.size === 0
      ) {
        throw new Error(
          "The generated PDF is empty."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const url =
        URL.createObjectURL(
          blob
        );

      setResultUrl(url);
      setResultName(
        `handwriting-${Date.now()}.pdf`
      );
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Failed to create the PDF."
      );
    }
  }

  function getPreviewPaperClass() {
    if (
      orientation ===
      "landscape"
    ) {
      return "landscape";
    }

    return "portrait";
  }

  return (
    <div className="handwriting-to-pdf-tool">
      <style>{`
        .handwriting-to-pdf-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .handwriting-to-pdf-shell {
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 28px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 26px;
          background:
            linear-gradient(
              180deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(22px);
          box-shadow:
            0 24px 80px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .handwriting-to-pdf-upload {
          min-height: 330px;
          padding: 42px 30px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(255,145,60,0.35);
          border-radius: 22px;
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.08),
              transparent 62%
            ),
            rgba(255,255,255,0.02);
          text-align: center;
          transition: 0.2s ease;
        }

        .handwriting-to-pdf-upload.active {
          border-color: rgba(255,145,60,0.75);
          background:
            radial-gradient(
              circle at center,
              rgba(255,110,30,0.15),
              transparent 65%
            ),
            rgba(255,255,255,0.035);
          transform: translateY(-1px);
        }

        .handwriting-to-pdf-upload-icon {
          width: 66px;
          height: 66px;
          margin-bottom: 18px;
          display: grid;
          place-items: center;
          border-radius: 18px;
          border: 1px solid rgba(255,145,60,0.18);
          background: rgba(255,100,30,0.1);
          color: #ff8a3d;
          font-size: 20px;
          font-weight: 900;
        }

        .handwriting-to-pdf-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .handwriting-to-pdf-upload p {
          max-width: 610px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .handwriting-to-pdf-upload-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 17px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.07);
          color: #fff;
          cursor: pointer;
          font-size: 13px;
          font-weight: 800;
          transition: 0.2s ease;
        }

        .handwriting-to-pdf-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .handwriting-to-pdf-upload input {
          display: none;
        }

        .handwriting-to-pdf-loader {
          width: 30px;
          height: 30px;
          margin-bottom: 17px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: handwritingToPdfSpin 0.8s linear infinite;
        }

        @keyframes handwritingToPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .handwriting-to-pdf-file-bar {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 18px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .handwriting-to-pdf-file-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 12px;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 900;
        }

        .handwriting-to-pdf-file-info {
          flex: 1;
          min-width: 0;
        }

        .handwriting-to-pdf-file-info strong {
          display: block;
          font-size: 14px;
        }

        .handwriting-to-pdf-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .handwriting-to-pdf-clear {
          min-height: 35px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.7);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .handwriting-to-pdf-clear:hover {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .handwriting-to-pdf-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(360px, 0.9fr);
          gap: 18px;
          align-items: start;
        }

        .handwriting-to-pdf-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .handwriting-to-pdf-section + .handwriting-to-pdf-section {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .handwriting-to-pdf-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .handwriting-to-pdf-file-list {
          display: grid;
          gap: 9px;
          max-height: 370px;
          overflow: auto;
          padding-right: 3px;
        }

        .handwriting-to-pdf-image-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.03);
        }

        .handwriting-to-pdf-image-number {
          width: 27px;
          height: 27px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(255,110,30,0.08);
          color: #ff9b57;
          font-size: 9px;
          font-weight: 900;
        }

        .handwriting-to-pdf-image-icon {
          width: 33px;
          height: 33px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.55);
          font-size: 9px;
          font-weight: 900;
        }

        .handwriting-to-pdf-image-info {
          flex: 1;
          min-width: 0;
        }

        .handwriting-to-pdf-image-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
        }

        .handwriting-to-pdf-image-info span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,0.38);
          font-size: 9px;
        }

        .handwriting-to-pdf-image-actions {
          display: flex;
          gap: 4px;
        }

        .handwriting-to-pdf-image-actions button {
          width: 29px;
          height: 29px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.6);
          cursor: pointer;
          font-size: 12px;
        }

        .handwriting-to-pdf-image-actions button:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .handwriting-to-pdf-image-actions button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .handwriting-to-pdf-add {
          width: 100%;
          min-height: 42px;
          margin-top: 10px;
          border-radius: 11px;
          border: 1px dashed rgba(255,145,60,0.22);
          background: rgba(255,110,30,0.025);
          color: #ffae78;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .handwriting-to-pdf-add:hover {
          background: rgba(255,110,30,0.06);
          border-color: rgba(255,145,60,0.4);
        }

        .handwriting-to-pdf-add input {
          display: none;
        }

        .handwriting-to-pdf-fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .handwriting-to-pdf-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .handwriting-to-pdf-field.full {
          grid-column: 1 / -1;
        }

        .handwriting-to-pdf-field label {
          color: rgba(255,255,255,0.43);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.35px;
        }

        .handwriting-to-pdf-field select,
        .handwriting-to-pdf-field input[type="number"] {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          padding: 10px 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 12px;
        }

        .handwriting-to-pdf-field select:focus,
        .handwriting-to-pdf-field input[type="number"]:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .handwriting-to-pdf-field select option {
          background: #1d1a18;
          color: #fff;
        }

        .handwriting-to-pdf-range {
          grid-column: 1 / -1;
        }

        .handwriting-to-pdf-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .handwriting-to-pdf-range-row input {
          flex: 1;
          accent-color: #ff7c34;
        }

        .handwriting-to-pdf-range-value {
          min-width: 48px;
          text-align: right;
          color: rgba(255,255,255,0.58);
          font-size: 11px;
        }

        .handwriting-to-pdf-preview-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .handwriting-to-pdf-preview-wrap {
          min-height: 610px;
          padding: 18px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(255,110,30,0.05),
              transparent 55%
            ),
            rgba(0,0,0,0.13);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .handwriting-to-pdf-paper {
          position: relative;
          width: 325px;
          height: 460px;
          padding: 38px 29px;
          box-sizing: border-box;
          overflow: hidden;
          border-radius: 3px;
          background:
            repeating-linear-gradient(
              to bottom,
              #fffdf7 0px,
              #fffdf7 27px,
              rgba(80,120,190,0.14) 28px,
              #fffdf7 29px
            );
          color: rgba(38,63,103,0.8);
          box-shadow:
            0 22px 45px rgba(0,0,0,0.28),
            0 2px 7px rgba(0,0,0,0.16);
          transition: 0.2s ease;
        }

        .handwriting-to-pdf-paper.landscape {
          width: 460px;
          height: 325px;
        }

        .handwriting-to-pdf-paper.journal {
          background:
            repeating-linear-gradient(
              to bottom,
              #fffdf7 0px,
              #fffdf7 27px,
              rgba(135,80,80,0.14) 28px,
              #fffdf7 29px
            );
        }

        .handwriting-to-pdf-paper.journal::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 39px;
          width: 1px;
          background: rgba(210,75,75,0.28);
        }

        .handwriting-to-pdf-paper-header {
          margin-bottom: 20px;
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 8px;
          font-weight: 600;
          color: rgba(35,48,75,0.48);
        }

        .handwriting-to-pdf-paper-title {
          margin: 0 0 15px;
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 20px;
          line-height: 1.3;
          font-weight: 700;
          color: rgba(30,52,91,0.85);
        }

        .handwriting-to-pdf-paper-lines {
          display: grid;
          gap: 13px;
        }

        .handwriting-to-pdf-paper-lines span {
          display: block;
          width: 93%;
          height: 7px;
          border-radius: 50%;
          background: rgba(35,57,93,0.26);
          transform-origin: left center;
        }

        .handwriting-to-pdf-paper-lines span:nth-child(2) {
          width: 84%;
          transform: rotate(-0.25deg);
        }

        .handwriting-to-pdf-paper-lines span:nth-child(3) {
          width: 90%;
          transform: rotate(0.25deg);
        }

        .handwriting-to-pdf-paper-lines span:nth-child(4) {
          width: 68%;
          transform: rotate(-0.15deg);
        }

        .handwriting-to-pdf-paper-lines span:nth-child(5) {
          width: 88%;
          transform: rotate(0.3deg);
        }

        .handwriting-to-pdf-paper-lines span:nth-child(6) {
          width: 73%;
          transform: rotate(-0.35deg);
        }

        .handwriting-to-pdf-paper-footer {
          position: absolute;
          left: 29px;
          right: 29px;
          bottom: 20px;
          display: flex;
          justify-content: space-between;
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 7px;
          color: rgba(35,48,75,0.45);
        }

        .handwriting-to-pdf-preview-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 12px;
        }

        .handwriting-to-pdf-chip {
          padding: 6px 9px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .handwriting-to-pdf-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .handwriting-to-pdf-primary,
        .handwriting-to-pdf-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .handwriting-to-pdf-primary {
          flex: 1;
          border: 1px solid rgba(255,145,60,0.28);
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,165,90,0.35),
              transparent 58%
            ),
            linear-gradient(
              180deg,
              rgba(255,110,30,0.9),
              rgba(220,72,14,0.9)
            );
          color: #fff;
          box-shadow:
            0 10px 28px rgba(255,90,20,0.14),
            inset 0 1px 0 rgba(255,255,255,0.16);
        }

        .handwriting-to-pdf-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .handwriting-to-pdf-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .handwriting-to-pdf-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .handwriting-to-pdf-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .handwriting-to-pdf-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .handwriting-to-pdf-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .handwriting-to-pdf-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .handwriting-to-pdf-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .handwriting-to-pdf-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .handwriting-to-pdf-result strong {
          display: block;
          font-size: 14px;
        }

        .handwriting-to-pdf-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .handwriting-to-pdf-download {
          display: inline-flex;
          margin-top: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1px solid rgba(255,145,60,0.2);
          background: rgba(255,110,30,0.1);
          color: #ffae78;
          text-decoration: none;
          font-size: 12px;
          font-weight: 800;
        }

        .handwriting-to-pdf-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        @media (max-width: 920px) {
          .handwriting-to-pdf-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .handwriting-to-pdf-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .handwriting-to-pdf-fields {
            grid-template-columns: 1fr;
          }

          .handwriting-to-pdf-field.full,
          .handwriting-to-pdf-range {
            grid-column: auto;
          }

          .handwriting-to-pdf-preview-wrap {
            min-height: 480px;
            overflow: auto;
          }

          .handwriting-to-pdf-paper {
            width: 280px;
            height: 395px;
          }

          .handwriting-to-pdf-paper.landscape {
            width: 395px;
            height: 280px;
          }

          .handwriting-to-pdf-actions {
            flex-direction: column;
          }

          .handwriting-to-pdf-primary,
          .handwriting-to-pdf-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="handwriting-to-pdf-shell">
        {files.length === 0 && (
          <div
            className={`handwriting-to-pdf-upload ${
              dragActive
                ? "active"
                : ""
            }`}
            onDragOver={(
              event
            ) => {
              event.preventDefault();
              setDragActive(
                true
              );
            }}
            onDragLeave={() =>
              setDragActive(
                false
              )
            }
            onDrop={
              handleDrop
            }
          >
            {status ===
            "loading" ? (
              <>
                <div className="handwriting-to-pdf-loader" />

                <h3>
                  Reading handwriting…
                </h3>

                <p>
                  Analyzing the selected
                  handwriting images.
                </p>
              </>
            ) : (
              <>
                <div className="handwriting-to-pdf-upload-icon">
                  ✎
                </div>

                <h3>
                  Turn handwriting into PDF
                </h3>

                <p>
                  Upload handwritten pages,
                  arrange them in the order you
                  want, and combine them into one
                  polished PDF.
                </p>

                <label className="handwriting-to-pdf-upload-button">
                  Choose Images

                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                    multiple
                    onChange={
                      handleFileInput
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}

        {files.length === 0 &&
          status ===
            "error" &&
          error && (
            <div className="handwriting-to-pdf-error">
              {error}
            </div>
          )}

        {files.length > 0 &&
          fileInfo && (
            <>
              <div className="handwriting-to-pdf-file-bar">
                <div className="handwriting-to-pdf-file-icon">
                  IMG
                </div>

                <div className="handwriting-to-pdf-file-info">
                  <strong>
                    {files.length}{" "}
                    {files.length ===
                    1
                      ? "handwriting page"
                      : "handwriting pages"}
                  </strong>

                  <span>
                    {formatFileSize(
                      totalSize
                    )}{" "}
                    total
                  </span>
                </div>

                <button
                  type="button"
                  className="handwriting-to-pdf-clear"
                  onClick={
                    removeAllFiles
                  }
                  disabled={
                    status ===
                    "processing"
                  }
                >
                  Clear all
                </button>
              </div>

              <div className="handwriting-to-pdf-grid">
                <div className="handwriting-to-pdf-card">
                  <div className="handwriting-to-pdf-section">
                    <h3 className="handwriting-to-pdf-section-title">
                      HANDWRITING PAGES
                    </h3>

                    <div className="handwriting-to-pdf-file-list">
                      {files.map(
                        (
                          file,
                          index
                        ) => (
                          <div
                            key={`${file.name}-${file.lastModified}-${index}`}
                            className="handwriting-to-pdf-image-row"
                          >
                            <div className="handwriting-to-pdf-image-number">
                              {String(
                                index +
                                  1
                              ).padStart(
                                2,
                                "0"
                              )}
                            </div>

                            <div className="handwriting-to-pdf-image-icon">
                              IMG
                            </div>

                            <div className="handwriting-to-pdf-image-info">
                              <strong>
                                {
                                  file.name
                                }
                              </strong>

                              <span>
                                {
                                  fileInfo
                                    .images[
                                    index
                                  ]
                                    ?.width
                                }{" "}
                                ×{" "}
                                {
                                  fileInfo
                                    .images[
                                    index
                                  ]
                                    ?.height
                                }{" "}
                                ·{" "}
                                {formatFileSize(
                                  file.size
                                )}
                              </span>
                            </div>

                            <div className="handwriting-to-pdf-image-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  moveFileUp(
                                    index
                                  )
                                }
                                disabled={
                                  index ===
                                    0 ||
                                  status ===
                                    "processing"
                                }
                                aria-label={`Move ${file.name} up`}
                              >
                                ↑
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  moveFileDown(
                                    index
                                  )
                                }
                                disabled={
                                  index ===
                                    files.length -
                                      1 ||
                                  status ===
                                    "processing"
                                }
                                aria-label={`Move ${file.name} down`}
                              >
                                ↓
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  removeFile(
                                    index
                                  )
                                }
                                disabled={
                                  status ===
                                  "processing"
                                }
                                aria-label={`Remove ${file.name}`}
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        )
                      )}
                    </div>

                    <label className="handwriting-to-pdf-add">
                      + Add more handwriting pages

                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                        multiple
                        onChange={
                          handleFileInput
                        }
                      />
                    </label>
                  </div>

                  <div className="handwriting-to-pdf-section">
                    <h3 className="handwriting-to-pdf-section-title">
                      PAGE SETUP
                    </h3>

                    <div className="handwriting-to-pdf-fields">
                      <div className="handwriting-to-pdf-field">
                        <label>
                          PAGE SIZE
                        </label>

                        <select
                          value={
                            pageSize
                          }
                          onChange={(
                            event
                          ) =>
                            setPageSize(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="A4">
                            A4
                          </option>

                          <option value="A5">
                            A5
                          </option>

                          <option value="Letter">
                            Letter
                          </option>

                          <option value="Legal">
                            Legal
                          </option>

                          <option value="original">
                            Original size
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          ORIENTATION
                        </label>

                        <select
                          value={
                            orientation
                          }
                          onChange={(
                            event
                          ) =>
                            setOrientation(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="portrait">
                            Portrait
                          </option>

                          <option value="landscape">
                            Landscape
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          FIT
                        </label>

                        <select
                          value={fit}
                          onChange={(
                            event
                          ) =>
                            setFit(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="contain">
                            Contain
                          </option>

                          <option value="cover">
                            Cover
                          </option>

                          <option value="width">
                            Fit width
                          </option>

                          <option value="height">
                            Fit height
                          </option>

                          <option value="original">
                            Original size
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          ROTATION
                        </label>

                        <select
                          value={rotation}
                          onChange={(
                            event
                          ) =>
                            setRotation(
                              Number(
                                event
                                  .target
                                  .value
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="0">
                            0°
                          </option>

                          <option value="90">
                            90°
                          </option>

                          <option value="180">
                            180°
                          </option>

                          <option value="270">
                            270°
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          HORIZONTAL
                          ALIGNMENT
                        </label>

                        <select
                          value={
                            alignment
                          }
                          onChange={(
                            event
                          ) =>
                            setAlignment(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="left">
                            Left
                          </option>

                          <option value="center">
                            Center
                          </option>

                          <option value="right">
                            Right
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          VERTICAL
                          ALIGNMENT
                        </label>

                        <select
                          value={
                            verticalAlignment
                          }
                          onChange={(
                            event
                          ) =>
                            setVerticalAlignment(
                              event
                                .target
                                .value
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <option value="top">
                            Top
                          </option>

                          <option value="center">
                            Center
                          </option>

                          <option value="bottom">
                            Bottom
                          </option>
                        </select>
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          MARGIN
                        </label>

                        <input
                          type="number"
                          min="0"
                          max="150"
                          value={
                            margin
                          }
                          onChange={(
                            event
                          ) =>
                            setMargin(
                              Math.max(
                                0,
                                Math.min(
                                  150,
                                  Number(
                                    event
                                      .target
                                      .value
                                  ) ||
                                    0
                                )
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />
                      </div>

                      <div className="handwriting-to-pdf-field">
                        <label>
                          IMAGE QUALITY
                        </label>

                        <div className="handwriting-to-pdf-range-row">
                          <input
                            type="range"
                            min="0.4"
                            max="1"
                            step="0.01"
                            value={
                              imageQuality
                            }
                            onChange={(
                              event
                            ) =>
                              setImageQuality(
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            disabled={
                              status ===
                              "processing"
                            }
                          />

                          <span className="handwriting-to-pdf-range-value">
                            {Math.round(
                              imageQuality *
                                100
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="handwriting-to-pdf-card">
                  <h3 className="handwriting-to-pdf-preview-title">
                    PAGE PREVIEW
                  </h3>

                  <div className="handwriting-to-pdf-preview-wrap">
                    <div
                      className={`handwriting-to-pdf-paper ${getPreviewPaperClass()}`}
                      style={{
                        transform:
                          `rotate(${
                            rotation ===
                            90
                              ? "-0.2deg"
                              : rotation ===
                                270
                              ? "0.2deg"
                              : "0deg"
                          })`,
                      }}
                    >
                      <div className="handwriting-to-pdf-paper-header">
                        KAIZEN · HANDWRITTEN PAGE
                      </div>

                      <h2 className="handwriting-to-pdf-paper-title">
                        My Notes
                      </h2>

                      <div className="handwriting-to-pdf-paper-lines">
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                        <span />
                      </div>

                      <div className="handwriting-to-pdf-paper-footer">
                        <span>
                          Handwriting
                        </span>

                        <span>
                          Page 01
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="handwriting-to-pdf-preview-meta">
                    <span className="handwriting-to-pdf-chip">
                      {pageSize ===
                      "original"
                        ? "Original"
                        : pageSize}
                    </span>

                    <span className="handwriting-to-pdf-chip">
                      {orientation ===
                      "portrait"
                        ? "Portrait"
                        : "Landscape"}
                    </span>

                    <span className="handwriting-to-pdf-chip">
                      {fit ===
                      "contain"
                        ? "Contain"
                        : fit ===
                          "cover"
                        ? "Cover"
                        : fit ===
                          "width"
                        ? "Fit width"
                        : fit ===
                          "height"
                        ? "Fit height"
                        : "Original"}
                    </span>

                    <span className="handwriting-to-pdf-chip">
                      {files.length}{" "}
                      {files.length ===
                      1
                        ? "page"
                        : "pages"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="handwriting-to-pdf-actions">
                <button
                  type="button"
                  className="handwriting-to-pdf-primary"
                  onClick={
                    handleCreatePdf
                  }
                  disabled={
                    status ===
                    "processing"
                  }
                >
                  {status ===
                  "processing"
                    ? `Creating PDF · ${progress}%`
                    : "Create PDF"}
                </button>

                <button
                  type="button"
                  className="handwriting-to-pdf-secondary"
                  onClick={
                    resetTool
                  }
                  disabled={
                    status ===
                    "processing"
                  }
                >
                  Reset
                </button>
              </div>

              {status ===
                "processing" && (
                <div className="handwriting-to-pdf-progress">
                  <div className="handwriting-to-pdf-progress-head">
                    <span>
                      Creating PDF
                    </span>

                    <span>
                      {progress}%
                    </span>
                  </div>

                  <div className="handwriting-to-pdf-progress-track">
                    <div
                      className="handwriting-to-pdf-progress-bar"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {status ===
                "success" &&
                resultUrl && (
                  <div className="handwriting-to-pdf-result">
                    <strong>
                      PDF created successfully.
                    </strong>

                    <span>
                      {resultName}
                    </span>

                    <a
                      className="handwriting-to-pdf-download"
                      href={
                        resultUrl
                      }
                      download={
                        resultName
                      }
                    >
                      Download PDF
                    </a>
                  </div>
                )}

              {status ===
                "error" &&
                error && (
                  <div className="handwriting-to-pdf-error">
                    {error}
                  </div>
                )}
            </>
          )}
      </div>
    </div>
  );
}

export default HandwritingToPdf;