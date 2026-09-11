import { useEffect, useMemo, useState } from "react";

import {
  getImagesToPdfInfo,
  imagesToPdf,
} from "../../../services/pdf/imagesToPdf";

function formatFileSize(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getBaseName(name) {
  return name.replace(/\.[^/.]+$/, "");
}

function ImagesToPdf() {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const [pageSize, setPageSize] =
    useState("a4");

  const [orientation, setOrientation] =
    useState("auto");

  const [fit, setFit] =
    useState("contain");

  const [margin, setMargin] =
    useState(24);

  const [backgroundColor, setBackgroundColor] =
    useState("#ffffff");

  const [imageQuality, setImageQuality] =
    useState(0.92);

  const [fileInfo, setFileInfo] =
    useState(null);

  const [validationError, setValidationError] =
    useState("");

  const [processingError, setProcessingError] =
    useState("");

  const [status, setStatus] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [resultBlob, setResultBlob] =
    useState(null);

  const [resultUrl, setResultUrl] =
    useState("");

  const [resultName, setResultName] =
    useState("");

  const [previewUrls, setPreviewUrls] =
    useState([]);

  const isProcessing =
    status === "processing";

  useEffect(() => {
    const urls = files.map((file) =>
      URL.createObjectURL(file)
    );

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, [files]);

  useEffect(() => {
    if (!resultBlob) {
      setResultUrl("");
      return undefined;
    }

    const url =
      URL.createObjectURL(resultBlob);

    setResultUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [resultBlob]);

  const totalSize = useMemo(
    () =>
      files.reduce(
        (total, file) =>
          total + file.size,
        0
      ),
    [files]
  );

  function clearMessages() {
    setValidationError("");
    setProcessingError("");
  }

  async function handleFiles(
    incomingFiles
  ) {
    if (isProcessing) {
      return;
    }

    clearMessages();

    setResultBlob(null);
    setStatus("idle");

    const selectedFiles =
      Array.from(incomingFiles || []);

    if (
      selectedFiles.length === 0
    ) {
      return;
    }

    const imageFiles =
      selectedFiles.filter((file) => {
        const extension =
          file.name
            .split(".")
            .pop()
            ?.toLowerCase();

        return [
          "jpg",
          "jpeg",
          "png",
          "webp",
        ].includes(extension);
      });

    if (
      imageFiles.length === 0
    ) {
      setValidationError(
        "Please select JPG, PNG, or WebP images."
      );
      return;
    }

    if (
      imageFiles.length !==
      selectedFiles.length
    ) {
      setValidationError(
        "Some files were skipped because only JPG, PNG, and WebP images are supported."
      );
    }

    setFiles(imageFiles);

    try {
      setStatus("validating");

      const info =
        await getImagesToPdfInfo(
          imageFiles
        );

      setFileInfo(info);
      setStatus("ready");
    } catch (error) {
      setFiles([]);
      setFileInfo(null);
      setStatus("idle");

      setValidationError(
        error?.message ||
          "Unable to read the selected images."
      );
    }
  }

  function handleInputChange(
    event
  ) {
    handleFiles(
      Array.from(
        event.target.files || []
      )
    );

    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (!isProcessing) {
      setDragActive(true);
    }
  }

  function handleDragLeave(event) {
    event.preventDefault();

    if (
      event.currentTarget ===
      event.target
    ) {
      setDragActive(false);
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    setDragActive(false);

    if (isProcessing) {
      return;
    }

    handleFiles(
      Array.from(
        event.dataTransfer.files ||
          []
      )
    );
  }

  function moveFileUp(index) {
    if (
      index <= 0 ||
      isProcessing
    ) {
      return;
    }

    setFiles((current) => {
      const next = [
        ...current,
      ];

      [
        next[index - 1],
        next[index],
      ] = [
        next[index],
        next[index - 1],
      ];

      return next;
    });
  }

  function moveFileDown(index) {
    if (
      index >=
        files.length - 1 ||
      isProcessing
    ) {
      return;
    }

    setFiles((current) => {
      const next = [
        ...current,
      ];

      [
        next[index],
        next[index + 1],
      ] = [
        next[index + 1],
        next[index],
      ];

      return next;
    });
  }

  function removeFile(index) {
    if (isProcessing) {
      return;
    }

    setFiles((current) =>
      current.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    setResultBlob(null);
    setFileInfo(null);
    clearMessages();

    setStatus(
      files.length > 1
        ? "ready"
        : "idle"
    );
  }

  useEffect(() => {
    async function refreshInfo() {
      if (files.length === 0) {
        setFileInfo(null);
        setStatus("idle");
        return;
      }

      try {
        const info =
          await getImagesToPdfInfo(
            files
          );

        setFileInfo(info);

        if (
          status !== "processing" &&
          status !== "success"
        ) {
          setStatus("ready");
        }
      } catch (error) {
        setFileInfo(null);

        setValidationError(
          error?.message ||
            "Unable to read the selected images."
        );

        setStatus("error");
      }
    }

    refreshInfo();
  }, [files]);

  async function handleConvert() {
    if (
      files.length === 0 ||
      isProcessing
    ) {
      setValidationError(
        "Please add at least one image."
      );
      return;
    }

    clearMessages();

    setResultBlob(null);
    setProgress(0);
    setStatus("processing");

    try {
      const blob =
        await imagesToPdf(
          files,
          {
            pageSize,
            orientation,
            fit,
            margin:
              Number(margin) || 0,
            backgroundColor,
            imageQuality:
              Number(
                imageQuality
              ) || 0.92,
          },
          ({ percent }) => {
            setProgress(
              Math.max(
                0,
                Math.min(
                  100,
                  percent
                )
              )
            );
          }
        );

      const firstBaseName =
        getBaseName(
          files[0].name
        );

      const finalName =
        files.length === 1
          ? `${firstBaseName}.pdf`
          : `${firstBaseName}-images.pdf`;

      setResultBlob(blob);
      setResultName(finalName);
      setProgress(100);
      setStatus("success");
    } catch (error) {
      setProcessingError(
        error?.message ||
          "Something went wrong while creating the PDF."
      );

      setStatus("error");
    }
  }

  function handleReset() {
    if (isProcessing) {
      return;
    }

    setFiles([]);
    setFileInfo(null);
    setValidationError("");
    setProcessingError("");
    setProgress(0);
    setStatus("idle");
    setResultBlob(null);
    setResultName("");
  }

  function handleDownload() {
    if (
      !resultBlob ||
      !resultUrl
    ) {
      return;
    }

    const link =
      document.createElement("a");

    link.href = resultUrl;

    link.download =
      resultName ||
      "images.pdf";

    document.body.appendChild(
      link
    );

    link.click();
    link.remove();
  }

  return (
    <div className="images-to-pdf-tool">
      <style>{`
        .images-to-pdf-tool {
          width: 100%;
          box-sizing: border-box;

          /*
           * IMPORTANT:
           * Keep the complete tool content
           * away from the universal shell edge.
           */
          padding:
            26px 30px 38px;

          color:
            rgba(255, 255, 255, 0.94);
        }

        .images-to-pdf-header {
          width: 100%;
          box-sizing: border-box;
          margin-bottom: 28px;
        }

        .images-to-pdf-header h2 {
          margin: 0 0 10px;

          font-size: 28px;
          line-height: 1.15;
          font-weight: 700;
          letter-spacing: -0.04em;
        }

        .images-to-pdf-header p {
          margin: 0;

          max-width: 900px;

          color:
            rgba(255, 255, 255, 0.58);

          font-size: 14px;
          line-height: 1.65;
        }

        .images-to-pdf-dropzone {
          position: relative;

          width: 100%;
          box-sizing: border-box;

          min-height: 250px;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 34px;

          border:
            1px dashed
            rgba(255, 255, 255, 0.16);

          border-radius: 22px;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.035),
              rgba(255, 255, 255, 0.018)
            );

          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .images-to-pdf-dropzone.is-active {
          border-color:
            rgba(255, 112, 46, 0.78);

          background:
            linear-gradient(
              180deg,
              rgba(255, 112, 46, 0.10),
              rgba(255, 255, 255, 0.025)
            );

          transform:
            translateY(-1px);
        }

        .images-to-pdf-dropzone-content {
          width: 100%;
          max-width: 720px;
          text-align: center;
        }

        .images-to-pdf-upload-icon {
          width: 58px;
          height: 58px;

          margin:
            0 auto 16px;

          display: grid;
          place-items: center;

          border:
            1px solid
            rgba(255, 255, 255, 0.10);

          border-radius: 18px;

          background:
            rgba(255, 255, 255, 0.045);

          font-size: 24px;
        }

        .images-to-pdf-upload-title {
          margin-bottom: 8px;

          font-size: 17px;
          font-weight: 650;
        }

        .images-to-pdf-upload-subtitle {
          margin-bottom: 18px;

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 13px;
          line-height: 1.55;
        }

        .images-to-pdf-file-input {
          display: none;
        }

        .images-to-pdf-browse-button,
        .images-to-pdf-primary-button,
        .images-to-pdf-secondary-button,
        .images-to-pdf-download-button {
          appearance: none;
          border: 0;
          border-radius: 12px;
          font: inherit;
          cursor: pointer;

          transition:
            transform 160ms ease,
            opacity 160ms ease,
            background 160ms ease;
        }

        .images-to-pdf-browse-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          min-height: 42px;

          padding:
            0 18px;

          background:
            rgba(255, 255, 255, 0.09);

          color: white;
        }

        .images-to-pdf-browse-button:hover {
          background:
            rgba(255, 255, 255, 0.13);
        }

        .images-to-pdf-browse-button:active,
        .images-to-pdf-primary-button:active,
        .images-to-pdf-secondary-button:active,
        .images-to-pdf-download-button:active {
          transform:
            translateY(1px);
        }

        .images-to-pdf-message {
          margin-top: 14px;

          padding:
            12px 14px;

          border-radius: 12px;

          font-size: 13px;
          line-height: 1.5;
        }

        .images-to-pdf-message.error {
          border:
            1px solid
            rgba(255, 80, 80, 0.18);

          background:
            rgba(255, 80, 80, 0.075);

          color:
            rgba(255, 190, 190, 0.95);
        }

        .images-to-pdf-workspace {
          width: 100%;
          box-sizing: border-box;

          display: grid;

          grid-template-columns:
            minmax(0, 1.45fr)
            minmax(280px, 0.75fr);

          gap: 18px;

          margin-top: 20px;
        }

        .images-to-pdf-panel {
          min-width: 0;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          border-radius: 20px;

          background:
            rgba(255, 255, 255, 0.025);

          overflow: hidden;
        }

        .images-to-pdf-panel-header {
          padding:
            16px 18px;

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.07);

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;
        }

        .images-to-pdf-panel-title {
          font-size: 13px;
          font-weight: 650;
        }

        .images-to-pdf-panel-meta {
          color:
            rgba(255, 255, 255, 0.42);

          font-size: 11px;
          white-space: nowrap;
        }

        .images-to-pdf-image-list {
          padding: 12px;

          display: grid;
          gap: 10px;

          max-height: 500px;

          overflow-y: auto;
        }

        .images-to-pdf-image-card {
          display: grid;

          grid-template-columns:
            72px
            minmax(0, 1fr)
            auto;

          align-items: center;

          gap: 13px;

          padding: 10px;

          border:
            1px solid
            rgba(255, 255, 255, 0.065);

          border-radius: 15px;

          background:
            rgba(255, 255, 255, 0.025);
        }

        .images-to-pdf-preview {
          width: 72px;
          height: 72px;

          border-radius: 11px;

          overflow: hidden;

          border:
            1px solid
            rgba(255, 255, 255, 0.08);

          background:
            rgba(255, 255, 255, 0.045);

          display: grid;
          place-items: center;
        }

        .images-to-pdf-preview img {
          width: 100%;
          height: 100%;

          object-fit: cover;

          display: block;
        }

        .images-to-pdf-image-info {
          min-width: 0;
        }

        .images-to-pdf-image-name {
          margin-bottom: 5px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-size: 13px;
          font-weight: 600;
        }

        .images-to-pdf-image-meta {
          color:
            rgba(255, 255, 255, 0.42);

          font-size: 11px;
          line-height: 1.5;
        }

        .images-to-pdf-image-actions {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .images-to-pdf-icon-button {
          width: 30px;
          height: 30px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          border-radius: 9px;

          background:
            rgba(255, 255, 255, 0.035);

          color:
            rgba(255, 255, 255, 0.72);

          cursor: pointer;
          font: inherit;
        }

        .images-to-pdf-icon-button:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.075);

          color: white;
        }

        .images-to-pdf-icon-button:disabled {
          opacity: 0.25;
          cursor: default;
        }

        .images-to-pdf-settings {
          padding: 16px;

          display: grid;
          gap: 14px;
        }

        .images-to-pdf-field {
          display: grid;
          gap: 7px;
        }

        .images-to-pdf-field label {
          color:
            rgba(255, 255, 255, 0.62);

          font-size: 11px;
          font-weight: 600;

          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .images-to-pdf-field select,
        .images-to-pdf-field input[type="number"] {
          width: 100%;
          height: 40px;

          box-sizing: border-box;

          padding:
            0 12px;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          border-radius: 10px;

          outline: none;

          background:
            rgba(255, 255, 255, 0.045);

          color: white;
          font: inherit;
        }

        .images-to-pdf-field select:focus,
        .images-to-pdf-field input[type="number"]:focus {
          border-color:
            rgba(255, 112, 46, 0.55);
        }

        .images-to-pdf-color-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .images-to-pdf-color-input {
          width: 42px;
          height: 40px;

          padding: 3px;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.045);

          cursor: pointer;
        }

        .images-to-pdf-color-value {
          color:
            rgba(255, 255, 255, 0.45);

          font-size: 11px;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
        }

        .images-to-pdf-range {
          width: 100%;

          accent-color:
            #ff702e;
        }

        .images-to-pdf-range-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .images-to-pdf-range-value {
          min-width: 42px;

          text-align: right;

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 11px;

          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
        }

        .images-to-pdf-stats {
          margin-top: 2px;

          padding-top: 13px;

          border-top:
            1px solid
            rgba(255, 255, 255, 0.07);

          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            );

          gap: 10px;
        }

        .images-to-pdf-stat {
          padding: 10px;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.025);
        }

        .images-to-pdf-stat span {
          display: block;

          margin-bottom: 4px;

          color:
            rgba(255, 255, 255, 0.38);

          font-size: 10px;

          text-transform:
            uppercase;

          letter-spacing:
            0.03em;
        }

        .images-to-pdf-stat strong {
          display: block;

          font-size: 13px;
        }

        .images-to-pdf-actions {
          margin-top: 18px;

          display: flex;

          justify-content: flex-end;

          gap: 10px;

          flex-wrap: wrap;
        }

        .images-to-pdf-primary-button {
          min-height: 44px;

          padding:
            0 20px;

          background:
            radial-gradient(
              circle at center,
              rgba(255, 154, 96, 0.95),
              rgba(255, 112, 46, 0.95) 55%,
              rgba(232, 82, 20, 0.95)
            );

          box-shadow:
            0 10px 30px
            rgba(255, 93, 32, 0.17);

          color: white;

          font-weight: 650;
        }

        .images-to-pdf-primary-button:hover:not(:disabled) {
          transform:
            translateY(-1px);
        }

        .images-to-pdf-secondary-button {
          min-height: 44px;

          padding:
            0 18px;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          background:
            rgba(255, 255, 255, 0.045);

          color:
            rgba(255, 255, 255, 0.78);
        }

        .images-to-pdf-secondary-button:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.075);

          color: white;
        }

        .images-to-pdf-primary-button:disabled,
        .images-to-pdf-secondary-button:disabled,
        .images-to-pdf-download-button:disabled {
          opacity: 0.42;
          cursor: default;

          transform: none;
        }

        .images-to-pdf-progress {
          margin-top: 18px;

          padding:
            15px 16px;

          border:
            1px solid
            rgba(255, 255, 255, 0.075);

          border-radius: 14px;

          background:
            rgba(255, 255, 255, 0.025);
        }

        .images-to-pdf-progress-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          margin-bottom: 9px;
        }

        .images-to-pdf-progress-label {
          color:
            rgba(255, 255, 255, 0.64);

          font-size: 12px;
        }

        .images-to-pdf-progress-value {
          color:
            rgba(255, 255, 255, 0.86);

          font-size: 12px;

          font-variant-numeric:
            tabular-nums;
        }

        .images-to-pdf-progress-track {
          width: 100%;
          height: 7px;

          overflow: hidden;

          border-radius: 999px;

          background:
            rgba(255, 255, 255, 0.07);
        }

        .images-to-pdf-progress-fill {
          height: 100%;

          border-radius:
            inherit;

          background:
            linear-gradient(
              90deg,
              rgba(232, 82, 20, 0.9),
              rgba(255, 130, 61, 0.98)
            );

          transition:
            width 180ms ease;
        }

        .images-to-pdf-success {
          margin-top: 20px;

          padding: 20px;

          border:
            1px solid
            rgba(255, 255, 255, 0.09);

          border-radius: 20px;

          background:
            linear-gradient(
              180deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.022)
            );
        }

        .images-to-pdf-success-badge {
          display: inline-flex;

          align-items: center;

          min-height: 28px;

          padding:
            0 10px;

          border-radius: 999px;

          background:
            rgba(100, 220, 140, 0.10);

          color:
            rgba(175, 255, 195, 0.88);

          font-size: 11px;

          font-weight: 650;

          letter-spacing:
            0.04em;

          text-transform:
            uppercase;
        }

        .images-to-pdf-success h3 {
          margin:
            12px 0 7px;

          font-size: 20px;

          letter-spacing:
            -0.03em;
        }

        .images-to-pdf-success p {
          margin: 0;

          color:
            rgba(255, 255, 255, 0.47);

          font-size: 13px;

          line-height: 1.6;
        }

        .images-to-pdf-success-actions {
          margin-top: 16px;

          display: flex;

          gap: 10px;

          flex-wrap: wrap;
        }

        .images-to-pdf-download-button {
          min-height: 44px;

          padding:
            0 18px;

          background:
            rgba(255, 255, 255, 0.10);

          color: white;

          font-weight: 600;
        }

        .images-to-pdf-download-button:hover:not(:disabled) {
          background:
            rgba(255, 255, 255, 0.15);
        }

        .images-to-pdf-empty {
          padding:
            26px 16px;

          text-align: center;

          color:
            rgba(255, 255, 255, 0.36);

          font-size: 12px;
        }

        .images-to-pdf-note {
          margin-top: 12px;

          color:
            rgba(255, 255, 255, 0.34);

          font-size: 11px;

          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .images-to-pdf-tool {
            padding:
              24px 24px 32px;
          }

          .images-to-pdf-workspace {
            grid-template-columns:
              1fr;
          }
        }

        @media (max-width: 620px) {
          .images-to-pdf-tool {
            padding:
              20px 16px 26px;
          }

          .images-to-pdf-dropzone {
            padding: 24px 16px;
          }

          .images-to-pdf-image-card {
            grid-template-columns:
              58px
              minmax(0, 1fr);
          }

          .images-to-pdf-preview {
            width: 58px;
            height: 58px;
          }

          .images-to-pdf-image-actions {
            grid-column:
              1 / -1;

            flex-direction:
              row;

            justify-content:
              flex-end;
          }

          .images-to-pdf-actions {
            justify-content:
              stretch;
          }

          .images-to-pdf-primary-button,
          .images-to-pdf-secondary-button {
            flex: 1;
          }
        }
      `}</style>

      <div className="images-to-pdf-header">

        <h2>
          Images to PDF
        </h2>

        <p>
          Combine JPG, PNG, and WebP
          images into a clean PDF.
          Reorder your images, choose
          the page layout, and generate
          the PDF directly in your
          browser.
        </p>

      </div>

      <div
        className={`images-to-pdf-dropzone ${
          dragActive
            ? "is-active"
            : ""
        }`}
        onDragOver={
          handleDragOver
        }
        onDragLeave={
          handleDragLeave
        }
        onDrop={
          handleDrop
        }
      >

        <div className="images-to-pdf-dropzone-content">

          <div className="images-to-pdf-upload-icon">
            🖼
          </div>

          <div className="images-to-pdf-upload-title">
            Drop your images here
          </div>

          <div className="images-to-pdf-upload-subtitle">
            Add one or multiple JPG,
            PNG, or WebP images.
            Their order here becomes
            the page order in the PDF.
          </div>

          <label>

            <span className="images-to-pdf-browse-button">
              Choose Images
            </span>

            <input
              className="images-to-pdf-file-input"
              type="file"
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
              multiple
              onChange={
                handleInputChange
              }
              disabled={
                isProcessing
              }
            />

          </label>

        </div>

      </div>

      {validationError && (
        <div className="images-to-pdf-message error">
          {validationError}
        </div>
      )}

      {files.length > 0 && (
        <>

          <div className="images-to-pdf-workspace">

            <div className="images-to-pdf-panel">

              <div className="images-to-pdf-panel-header">

                <div className="images-to-pdf-panel-title">
                  Image order
                </div>

                <div className="images-to-pdf-panel-meta">
                  {files.length}{" "}
                  {files.length === 1
                    ? "image"
                    : "images"}
                </div>

              </div>

              <div className="images-to-pdf-image-list">

                {files.map(
                  (
                    file,
                    index
                  ) => (

                    <div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      className="images-to-pdf-image-card"
                    >

                      <div className="images-to-pdf-preview">

                        {previewUrls[
                          index
                        ] ? (
                          <img
                            src={
                              previewUrls[
                                index
                              ]
                            }
                            alt={
                              file.name
                            }
                          />
                        ) : (
                          <span>
                            🖼
                          </span>
                        )}

                      </div>

                      <div className="images-to-pdf-image-info">

                        <div className="images-to-pdf-image-name">
                          {file.name}
                        </div>

                        <div className="images-to-pdf-image-meta">

                          {formatFileSize(
                            file.size
                          )}

                          {" · "}

                          {file.type ||
                            "image"}

                          {fileInfo?.images?.[
                            index
                          ] && (
                            <>
                              {" · "}

                              {
                                fileInfo
                                  .images[
                                  index
                                ].width
                              }

                              ×

                              {
                                fileInfo
                                  .images[
                                  index
                                ].height
                              }

                              px
                            </>
                          )}

                        </div>

                      </div>

                      <div className="images-to-pdf-image-actions">

                        <button
                          type="button"
                          className="images-to-pdf-icon-button"
                          onClick={() =>
                            moveFileUp(
                              index
                            )
                          }
                          disabled={
                            isProcessing ||
                            index === 0
                          }
                          aria-label={`Move ${file.name} up`}
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          className="images-to-pdf-icon-button"
                          onClick={() =>
                            moveFileDown(
                              index
                            )
                          }
                          disabled={
                            isProcessing ||
                            index ===
                              files.length -
                                1
                          }
                          aria-label={`Move ${file.name} down`}
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          className="images-to-pdf-icon-button"
                          onClick={() =>
                            removeFile(
                              index
                            )
                          }
                          disabled={
                            isProcessing
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

            </div>

            <div className="images-to-pdf-panel">

              <div className="images-to-pdf-panel-header">

                <div className="images-to-pdf-panel-title">
                  PDF settings
                </div>

              </div>

              <div className="images-to-pdf-settings">

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-page-size">
                    Page size
                  </label>

                  <select
                    id="images-pdf-page-size"
                    value={
                      pageSize
                    }
                    onChange={(event) =>
                      setPageSize(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >

                    <option value="a4">
                      A4
                    </option>

                    <option value="a3">
                      A3
                    </option>

                    <option value="letter">
                      Letter
                    </option>

                    <option value="legal">
                      Legal
                    </option>

                  </select>

                </div>

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-orientation">
                    Orientation
                  </label>

                  <select
                    id="images-pdf-orientation"
                    value={
                      orientation
                    }
                    onChange={(event) =>
                      setOrientation(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >

                    <option value="auto">
                      Auto
                    </option>

                    <option value="portrait">
                      Portrait
                    </option>

                    <option value="landscape">
                      Landscape
                    </option>

                  </select>

                </div>

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-fit">
                    Image fit
                  </label>

                  <select
                    id="images-pdf-fit"
                    value={fit}
                    onChange={(event) =>
                      setFit(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  >

                    <option value="contain">
                      Fit inside page
                    </option>

                    <option value="cover">
                      Fill page
                    </option>

                  </select>

                </div>

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-margin">
                    Margin
                  </label>

                  <input
                    id="images-pdf-margin"
                    type="number"
                    min="0"
                    max="200"
                    step="1"
                    value={margin}
                    onChange={(event) =>
                      setMargin(
                        Math.max(
                          0,
                          Math.min(
                            200,
                            Number(
                              event
                                .target
                                .value
                            ) || 0
                          )
                        )
                      )
                    }
                    disabled={
                      isProcessing
                    }
                  />

                </div>

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-background">
                    Background
                  </label>

                  <div className="images-to-pdf-color-row">

                    <input
                      id="images-pdf-background"
                      className="images-to-pdf-color-input"
                      type="color"
                      value={
                        backgroundColor
                      }
                      onChange={(event) =>
                        setBackgroundColor(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />

                    <span className="images-to-pdf-color-value">
                      {backgroundColor.toUpperCase()}
                    </span>

                  </div>

                </div>

                <div className="images-to-pdf-field">

                  <label htmlFor="images-pdf-quality">
                    Image quality
                  </label>

                  <div className="images-to-pdf-range-row">

                    <input
                      id="images-pdf-quality"
                      className="images-to-pdf-range"
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.01"
                      value={
                        imageQuality
                      }
                      onChange={(event) =>
                        setImageQuality(
                          Number(
                            event.target
                              .value
                          )
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />

                    <span className="images-to-pdf-range-value">
                      {Math.round(
                        imageQuality *
                          100
                      )}
                      %
                    </span>

                  </div>

                </div>

                <div className="images-to-pdf-stats">

                  <div className="images-to-pdf-stat">

                    <span>
                      Images
                    </span>

                    <strong>
                      {files.length}
                    </strong>

                  </div>

                  <div className="images-to-pdf-stat">

                    <span>
                      Input size
                    </span>

                    <strong>
                      {formatFileSize(
                        totalSize
                      )}
                    </strong>

                  </div>

                  <div className="images-to-pdf-stat">

                    <span>
                      Output pages
                    </span>

                    <strong>
                      {files.length}
                    </strong>

                  </div>

                  <div className="images-to-pdf-stat">

                    <span>
                      Processing
                    </span>

                    <strong>
                      Local
                    </strong>

                  </div>

                </div>

                <div className="images-to-pdf-note">
                  Every selected image
                  becomes one PDF page.
                  Original image order can
                  be changed before
                  conversion.
                </div>

              </div>

            </div>

          </div>

          {isProcessing && (
            <div className="images-to-pdf-progress">

              <div className="images-to-pdf-progress-top">

                <span className="images-to-pdf-progress-label">
                  Creating your PDF…
                </span>

                <span className="images-to-pdf-progress-value">
                  {progress}%
                </span>

              </div>

              <div className="images-to-pdf-progress-track">

                <div
                  className="images-to-pdf-progress-fill"
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />

              </div>

            </div>
          )}

          {processingError && (
            <div className="images-to-pdf-message error">
              {processingError}
            </div>
          )}

          <div className="images-to-pdf-actions">

            <button
              type="button"
              className="images-to-pdf-secondary-button"
              onClick={
                handleReset
              }
              disabled={
                isProcessing
              }
            >
              Reset
            </button>

            <button
              type="button"
              className="images-to-pdf-primary-button"
              onClick={
                handleConvert
              }
              disabled={
                isProcessing ||
                files.length === 0
              }
            >
              {isProcessing
                ? "Creating PDF…"
                : "Create PDF"}
            </button>

          </div>

        </>
      )}

      {status === "success" &&
        resultBlob && (

          <div className="images-to-pdf-success">

            <span className="images-to-pdf-success-badge">
              Completed
            </span>

            <h3>
              Your PDF is ready.
            </h3>

            <p>
              {resultName} has been
              created successfully with{" "}
              {files.length}{" "}
              {files.length === 1
                ? "image"
                : "images"}.
            </p>

            <div className="images-to-pdf-success-actions">

              <button
                type="button"
                className="images-to-pdf-download-button"
                onClick={
                  handleDownload
                }
              >
                Download PDF
              </button>

              <button
                type="button"
                className="images-to-pdf-secondary-button"
                onClick={
                  handleReset
                }
              >
                Create Another
              </button>

            </div>

          </div>

        )}

    </div>
  );
}

export default ImagesToPdf;