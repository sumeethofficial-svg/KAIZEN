import { useEffect, useMemo, useState } from "react";
import {
  createCustomHandwritingProfile,
  getHandwritingStyles,
  getPdfToHandwritingInfo,
  pdfToHandwriting,
} from "../../../services/pdf/pdfToHandwriting.js";

function PdfToHandwriting() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [style, setStyle] = useState("classic");
  const [paperStyle, setPaperStyle] = useState("plain");
  const [renderScale, setRenderScale] = useState(1.5);

  const [userIntensity, setUserIntensity] = useState(1);
  const [userSlant, setUserSlant] = useState(0);
  const [userTexture, setUserTexture] = useState(0);
  const [userJitter, setUserJitter] = useState(0);

  const [handwritingSample, setHandwritingSample] = useState(null);
  const [customProfile, setCustomProfile] = useState(null);
  const [sampleStatus, setSampleStatus] = useState("idle");
  const [sampleError, setSampleError] = useState("");

  const [dragActive, setDragActive] = useState(false);
  const [sampleDragActive, setSampleDragActive] =
    useState(false);

  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const [resultUrl, setResultUrl] = useState("");
  const [resultName, setResultName] = useState("");

  const styles = useMemo(
    () => getHandwritingStyles(),
    []
  );

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  function formatFileSize(bytes) {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function loadFile(selectedFile) {
    if (!selectedFile) {
      return;
    }

    setError("");
    setStatus("loading");
    setProgress(0);

    try {
      const isPdf =
        selectedFile.type === "application/pdf" ||
        selectedFile.name
          .toLowerCase()
          .endsWith(".pdf");

      if (!isPdf) {
        throw new Error(
          "Please select a PDF file."
        );
      }

      const info =
        await getPdfToHandwritingInfo(
          selectedFile
        );

      if (!info || !info.pageCount) {
        throw new Error(
          "Unable to read the PDF. The file may be damaged or unsupported."
        );
      }

      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFile(selectedFile);
      setPdfInfo(info);
      setResultUrl("");
      setResultName("");
      setProgress(0);
      setError("");
      setStatus("ready");
    } catch (err) {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }

      setFile(null);
      setPdfInfo(null);
      setResultUrl("");
      setResultName("");
      setProgress(0);
      setStatus("error");
      setError(
        err?.message ||
          "Unable to read the PDF."
      );
    }
  }

  function handleFileInput(event) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      loadFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadFile(droppedFile);
    }
  }

  async function loadHandwritingSample(
    selectedFile
  ) {
    if (!selectedFile) {
      return;
    }

    setSampleError("");
    setSampleStatus("loading");

    try {
      const validTypes = [
        "image/png",
        "image/jpeg",
        "image/webp",
      ];

      const lowerName =
        selectedFile.name.toLowerCase();

      const validExtension =
        lowerName.endsWith(".png") ||
        lowerName.endsWith(".jpg") ||
        lowerName.endsWith(".jpeg") ||
        lowerName.endsWith(".webp");

      if (
        !validTypes.includes(
          selectedFile.type
        ) &&
        !validExtension
      ) {
        throw new Error(
          "Use a PNG, JPG, JPEG, or WebP handwriting sample."
        );
      }

      const profile =
        await createCustomHandwritingProfile(
          selectedFile
        );

      setHandwritingSample(
        selectedFile
      );

      setCustomProfile(profile);
      setSampleStatus("ready");
      setSampleError("");
      setStyle("custom");
    } catch (err) {
      setHandwritingSample(null);
      setCustomProfile(null);
      setSampleStatus("error");
      setSampleError(
        err?.message ||
          "Unable to analyze the handwriting sample."
      );
    }
  }

  function handleSampleInput(event) {
    const selectedFile =
      event.target.files?.[0];

    if (selectedFile) {
      loadHandwritingSample(
        selectedFile
      );
    }

    event.target.value = "";
  }

  function handleSampleDrop(event) {
    event.preventDefault();
    setSampleDragActive(false);

    const droppedFile =
      event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadHandwritingSample(
        droppedFile
      );
    }
  }

  function removeSample() {
    setHandwritingSample(null);
    setCustomProfile(null);
    setSampleStatus("idle");
    setSampleError("");

    if (style === "custom") {
      setStyle("classic");
    }
  }

  function removeFile() {
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }

    setFile(null);
    setPdfInfo(null);
    setResultUrl("");
    setResultName("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }

  function resetTool() {
    removeFile();

    setStyle("classic");
    setPaperStyle("plain");
    setRenderScale(1.5);
    setUserIntensity(1);
    setUserSlant(0);
    setUserTexture(0);
    setUserJitter(0);

    setHandwritingSample(null);
    setCustomProfile(null);
    setSampleStatus("idle");
    setSampleError("");
  }

  async function handleConvert() {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    if (
      style === "custom" &&
      !customProfile
    ) {
      setError(
        "Please upload and analyze a handwriting sample first."
      );
      return;
    }

    try {
      setError("");
      setStatus("processing");
      setProgress(0);

      const blob =
        await pdfToHandwriting(
          file,
          {
            style,
            paperStyle,
            renderScale,
            userIntensity,
            userSlant,
            userTexture,
            userJitter,
            customProfile,
            customSample:
              handwritingSample,
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
        URL.revokeObjectURL(resultUrl);
      }

      const url =
        URL.createObjectURL(blob);

      const baseName =
        file.name.replace(
          /\.pdf$/i,
          ""
        );

      setResultUrl(url);
      setResultName(
        `${baseName}-handwriting.pdf`
      );
      setProgress(100);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(
        err?.message ||
          "Failed to convert the PDF to handwriting."
      );
    }
  }

  const selectedStyle = styles.find(
    (item) => item.id === style
  );

  const previewStyleName =
    style === "custom"
      ? "Your Handwriting"
      : selectedStyle?.name ||
        "Classic Student";

  return (
    <div className="pdf-to-handwriting-tool">
      <style>{`
        .pdf-to-handwriting-tool {
          width: 100%;
          color: #f5f5f5;
        }

        .pdf-to-handwriting-shell {
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

        .pdf-to-handwriting-upload {
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

        .pdf-to-handwriting-upload.active {
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

        .pdf-to-handwriting-upload-icon {
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

        .pdf-to-handwriting-upload h3 {
          margin: 0 0 8px;
          font-size: 21px;
        }

        .pdf-to-handwriting-upload p {
          max-width: 610px;
          margin: 0 0 22px;
          color: rgba(255,255,255,0.5);
          font-size: 14px;
          line-height: 1.65;
        }

        .pdf-to-handwriting-upload-button {
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

        .pdf-to-handwriting-upload-button:hover {
          background: rgba(255,255,255,0.11);
          border-color: rgba(255,145,60,0.3);
        }

        .pdf-to-handwriting-upload input,
        .pdf-to-handwriting-sample-upload input {
          display: none;
        }

        .pdf-to-handwriting-file {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border-radius: 15px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
        }

        .pdf-to-handwriting-file-icon {
          width: 44px;
          height: 44px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255,100,30,0.12);
          color: #ff8a3d;
          font-size: 11px;
          font-weight: 900;
        }

        .pdf-to-handwriting-file-info {
          flex: 1;
          min-width: 0;
        }

        .pdf-to-handwriting-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 14px;
        }

        .pdf-to-handwriting-file-info span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.43);
          font-size: 12px;
        }

        .pdf-to-handwriting-remove {
          width: 35px;
          height: 35px;
          flex: 0 0 auto;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.72);
          cursor: pointer;
          font-size: 18px;
        }

        .pdf-to-handwriting-remove:hover {
          color: #fff;
          border-color: rgba(255,100,30,0.35);
        }

        .pdf-to-handwriting-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 370px;
          gap: 18px;
          align-items: start;
        }

        .pdf-to-handwriting-card {
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
        }

        .pdf-to-handwriting-section + .pdf-to-handwriting-section {
          margin-top: 22px;
          padding-top: 22px;
          border-top: 1px solid rgba(255,255,255,0.07);
        }

        .pdf-to-handwriting-section-title {
          margin: 0 0 15px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .pdf-to-handwriting-style-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .pdf-to-handwriting-style {
          position: relative;
          padding: 14px;
          min-height: 92px;
          box-sizing: border-box;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          text-align: left;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .pdf-to-handwriting-style:hover {
          background: rgba(255,255,255,0.055);
          border-color: rgba(255,145,60,0.18);
        }

        .pdf-to-handwriting-style.selected {
          border-color: rgba(255,145,60,0.55);
          background:
            radial-gradient(
              circle at top left,
              rgba(255,110,30,0.11),
              transparent 70%
            ),
            rgba(255,255,255,0.04);
          box-shadow:
            inset 0 0 0 1px rgba(255,145,60,0.08);
        }

        .pdf-to-handwriting-style-name {
          display: block;
          margin-bottom: 6px;
          color: rgba(255,255,255,0.92);
          font-size: 13px;
          font-weight: 800;
        }

        .pdf-to-handwriting-style-description {
          display: block;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.5;
        }

        .pdf-to-handwriting-style-check {
          position: absolute;
          top: 11px;
          right: 11px;
          width: 19px;
          height: 19px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.12);
          color: transparent;
          font-size: 10px;
        }

        .pdf-to-handwriting-style.selected
          .pdf-to-handwriting-style-check {
          background: rgba(255,110,30,0.85);
          border-color: rgba(255,145,60,0.8);
          color: #fff;
        }

        .pdf-to-handwriting-custom {
          margin-top: 13px;
          padding: 15px;
          border-radius: 14px;
          border: 1px dashed rgba(255,145,60,0.22);
          background: rgba(255,110,30,0.035);
        }

        .pdf-to-handwriting-custom-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .pdf-to-handwriting-custom-title {
          font-size: 13px;
          font-weight: 800;
        }

        .pdf-to-handwriting-custom-copy {
          margin-top: 4px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.5;
        }

        .pdf-to-handwriting-sample-upload {
          margin-top: 13px;
          min-height: 100px;
          padding: 15px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          border: 1px dashed rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.025);
          text-align: center;
          transition: 0.2s ease;
        }

        .pdf-to-handwriting-sample-upload.active {
          border-color: rgba(255,145,60,0.55);
          background: rgba(255,110,30,0.06);
        }

        .pdf-to-handwriting-sample-upload strong {
          font-size: 11px;
        }

        .pdf-to-handwriting-sample-upload span {
          margin-top: 4px;
          color: rgba(255,255,255,0.37);
          font-size: 10px;
        }

        .pdf-to-handwriting-sample-button {
          display: inline-flex;
          margin-top: 9px;
          padding: 7px 10px;
          border-radius: 9px;
          border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.75);
          cursor: pointer;
          font-size: 10px;
          font-weight: 800;
        }

        .pdf-to-handwriting-sample-file {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 13px;
          padding: 10px 11px;
          border-radius: 11px;
          border: 1px solid rgba(101,209,131,0.13);
          background: rgba(80,190,110,0.04);
        }

        .pdf-to-handwriting-sample-file-icon {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 8px;
          background: rgba(255,255,255,0.06);
          color: #ffae78;
          font-size: 9px;
          font-weight: 900;
        }

        .pdf-to-handwriting-sample-file-info {
          flex: 1;
          min-width: 0;
        }

        .pdf-to-handwriting-sample-file-info strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
        }

        .pdf-to-handwriting-sample-file-info span {
          display: block;
          margin-top: 3px;
          color: rgba(255,255,255,0.4);
          font-size: 9px;
        }

        .pdf-to-handwriting-sample-remove {
          width: 29px;
          height: 29px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04);
          color: rgba(255,255,255,0.65);
          cursor: pointer;
        }

        .pdf-to-handwriting-sample-status {
          margin-top: 9px;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
        }

        .pdf-to-handwriting-sample-status.ready {
          color: #9ce0ae;
        }

        .pdf-to-handwriting-sample-error {
          margin-top: 9px;
          padding: 9px 10px;
          border-radius: 9px;
          background: rgba(255,70,60,0.05);
          border: 1px solid rgba(255,90,80,0.14);
          color: #ffb1aa;
          font-size: 10px;
          line-height: 1.5;
        }

        .pdf-to-handwriting-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .pdf-to-handwriting-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .pdf-to-handwriting-field label {
          color: rgba(255,255,255,0.43);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .pdf-to-handwriting-field select {
          width: 100%;
          min-height: 42px;
          padding: 10px 11px;
          box-sizing: border-box;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: #fff;
          outline: none;
          font: inherit;
          font-size: 12px;
        }

        .pdf-to-handwriting-field select:focus {
          border-color: rgba(255,135,55,0.55);
          box-shadow: 0 0 0 3px rgba(255,110,30,0.08);
        }

        .pdf-to-handwriting-field select option {
          background: #1d1a18;
          color: #fff;
        }

        .pdf-to-handwriting-range {
          grid-column: 1 / -1;
        }

        .pdf-to-handwriting-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .pdf-to-handwriting-range-row input {
          flex: 1;
          accent-color: #ff7c34;
        }

        .pdf-to-handwriting-range-value {
          min-width: 45px;
          text-align: right;
          color: rgba(255,255,255,0.6);
          font-size: 11px;
        }

        .pdf-to-handwriting-preview-title {
          margin: 0 0 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.7px;
          color: rgba(255,255,255,0.43);
        }

        .pdf-to-handwriting-preview-wrap {
          padding: 17px;
          border-radius: 16px;
          background:
            radial-gradient(
              circle at 50% 20%,
              rgba(255,110,30,0.05),
              transparent 55%
            ),
            rgba(0,0,0,0.13);
          border: 1px solid rgba(255,255,255,0.06);
        }

        .pdf-to-handwriting-paper {
          position: relative;
          min-height: 560px;
          padding: 52px 42px;
          box-sizing: border-box;
          overflow: hidden;
          border-radius: 4px;
          background: #fcfaf4;
          color: #24324a;
          box-shadow:
            0 18px 40px rgba(0,0,0,0.2),
            0 2px 6px rgba(0,0,0,0.13);
        }

        .pdf-to-handwriting-paper.lined {
          background-image:
            repeating-linear-gradient(
              to bottom,
              #fcfaf4 0px,
              #fcfaf4 28px,
              rgba(90,135,210,0.18) 29px,
              #fcfaf4 30px
            );
        }

        .pdf-to-handwriting-paper.grid {
          background-image:
            linear-gradient(
              rgba(100,125,160,0.12) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(100,125,160,0.12) 1px,
              transparent 1px
            );
          background-size: 28px 28px;
        }

        .pdf-to-handwriting-paper.journal {
          background-image:
            repeating-linear-gradient(
              to bottom,
              #fcfaf4 0px,
              #fcfaf4 28px,
              rgba(130,70,70,0.16) 29px,
              #fcfaf4 30px
            );
        }

        .pdf-to-handwriting-paper.journal::before {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 48px;
          width: 1px;
          background: rgba(210,75,75,0.3);
        }

        .pdf-to-handwriting-paper-header {
          margin-bottom: 27px;
          color: rgba(35,48,75,0.65);
          font-family:
            "Comic Sans MS",
            "Segoe Print",
            cursive;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }

        .pdf-to-handwriting-paper-title {
          margin: 0 0 24px;
          color: rgba(30,52,91,0.9);
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 25px;
          line-height: 1.25;
          font-weight: 700;
        }

        .pdf-to-handwriting-paper-line {
          height: 1px;
          width: 72%;
          margin: 12px 0 20px;
          background: rgba(30,52,91,0.2);
          transform:
            rotate(
              ${style === "casual" ? "-0.7deg" : "0deg"}
            );
        }

        .pdf-to-handwriting-paper-body {
          max-width: 90%;
          color: rgba(35,52,83,0.78);
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 12px;
          line-height: 2;
          white-space: normal;
        }

        .pdf-to-handwriting-paper-body p {
          margin: 0 0 15px;
        }

        .pdf-to-handwriting-paper-footer {
          position: absolute;
          bottom: 23px;
          left: 42px;
          right: 42px;
          display: flex;
          justify-content: space-between;
          color: rgba(35,48,75,0.5);
          font-family:
            "Segoe Print",
            "Comic Sans MS",
            cursive;
          font-size: 8px;
        }

        .pdf-to-handwriting-preview-badge {
          display: inline-flex;
          align-items: center;
          margin-top: 12px;
          padding: 7px 9px;
          border-radius: 9px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.055);
          color: rgba(255,255,255,0.47);
          font-size: 10px;
        }

        .pdf-to-handwriting-actions {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }

        .pdf-to-handwriting-primary,
        .pdf-to-handwriting-secondary {
          min-height: 46px;
          padding: 0 18px;
          border-radius: 13px;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .pdf-to-handwriting-primary {
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

        .pdf-to-handwriting-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow:
            0 14px 32px rgba(255,90,20,0.2),
            inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .pdf-to-handwriting-primary:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
        }

        .pdf-to-handwriting-secondary {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.045);
          color: rgba(255,255,255,0.75);
        }

        .pdf-to-handwriting-secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.08);
          color: #fff;
        }

        .pdf-to-handwriting-progress {
          margin-top: 16px;
          padding: 14px;
          border-radius: 13px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
        }

        .pdf-to-handwriting-progress-head {
          display: flex;
          justify-content: space-between;
          margin-bottom: 9px;
          color: rgba(255,255,255,0.58);
          font-size: 12px;
        }

        .pdf-to-handwriting-progress-track {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
        }

        .pdf-to-handwriting-progress-bar {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff6420,
            #ff9b57
          );
          transition: width 0.2s ease;
        }

        .pdf-to-handwriting-result {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          border: 1px solid rgba(101,209,131,0.15);
          background: rgba(80,190,110,0.045);
        }

        .pdf-to-handwriting-result strong {
          display: block;
          font-size: 14px;
        }

        .pdf-to-handwriting-result span {
          display: block;
          margin-top: 4px;
          color: rgba(255,255,255,0.46);
          font-size: 12px;
        }

        .pdf-to-handwriting-download {
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

        .pdf-to-handwriting-error {
          margin-top: 16px;
          padding: 13px 14px;
          border-radius: 12px;
          border: 1px solid rgba(255,90,80,0.17);
          background: rgba(255,70,60,0.055);
          color: #ffb1aa;
          font-size: 12px;
          line-height: 1.5;
        }

        .pdf-to-handwriting-loader {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.12);
          border-top-color: #ff7c34;
          animation: pdfHandwritingSpin 0.8s linear infinite;
        }

        @keyframes pdfHandwritingSpin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 920px) {
          .pdf-to-handwriting-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .pdf-to-handwriting-shell {
            padding: 17px;
            border-radius: 20px;
          }

          .pdf-to-handwriting-style-grid,
          .pdf-to-handwriting-options {
            grid-template-columns: 1fr;
          }

          .pdf-to-handwriting-paper {
            min-height: 470px;
            padding: 38px 28px;
          }

          .pdf-to-handwriting-paper-footer {
            left: 28px;
            right: 28px;
          }

          .pdf-to-handwriting-actions {
            flex-direction: column;
          }

          .pdf-to-handwriting-primary,
          .pdf-to-handwriting-secondary {
            width: 100%;
          }
        }
      `}</style>

      <div className="pdf-to-handwriting-shell">
        {!file && (
          <div
            className={`pdf-to-handwriting-upload ${
              dragActive ? "active" : ""
            }`}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() =>
              setDragActive(false)
            }
            onDrop={handleDrop}
          >
            {status === "loading" ? (
              <>
                <div className="pdf-to-handwriting-loader" />

                <h3>
                  Reading PDF…
                </h3>

                <p>
                  Validating the PDF and
                  reading its page information.
                </p>
              </>
            ) : (
              <>
                <div className="pdf-to-handwriting-upload-icon">
                  ✎
                </div>

                <h3>
                  Turn PDF into handwriting
                </h3>

                <p>
                  Transform your document into a
                  handwritten-style PDF with
                  different writing personalities
                  and paper styles.
                </p>

                <label className="pdf-to-handwriting-upload-button">
                  Choose PDF

                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={
                      handleFileInput
                    }
                  />
                </label>
              </>
            )}
          </div>
        )}

        {status === "error" &&
          !file &&
          error && (
            <div className="pdf-to-handwriting-error">
              {error}
            </div>
          )}

        {file && pdfInfo && (
          <>
            <div className="pdf-to-handwriting-file">
              <div className="pdf-to-handwriting-file-icon">
                PDF
              </div>

              <div className="pdf-to-handwriting-file-info">
                <strong>
                  {file.name}
                </strong>

                <span>
                  {pdfInfo.pageCount}{" "}
                  {pdfInfo.pageCount === 1
                    ? "page"
                    : "pages"}
                  {" · "}
                  {formatFileSize(
                    pdfInfo.size
                  )}
                </span>
              </div>

              <button
                type="button"
                className="pdf-to-handwriting-remove"
                onClick={
                  removeFile
                }
                disabled={
                  status === "processing"
                }
                aria-label="Remove PDF"
              >
                ×
              </button>
            </div>

            <div className="pdf-to-handwriting-grid">
              <div className="pdf-to-handwriting-card">
                <div className="pdf-to-handwriting-section">
                  <h3 className="pdf-to-handwriting-section-title">
                    HANDWRITING STYLE
                  </h3>

                  <div className="pdf-to-handwriting-style-grid">
                    {styles.map(
                      (item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`pdf-to-handwriting-style ${
                            style ===
                            item.id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            setStyle(
                              item.id
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        >
                          <span className="pdf-to-handwriting-style-name">
                            {
                              item.name
                            }
                          </span>

                          <span className="pdf-to-handwriting-style-description">
                            {
                              item.description
                            }
                          </span>

                          <span className="pdf-to-handwriting-style-check">
                            ✓
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  <div className="pdf-to-handwriting-custom">
                    <div className="pdf-to-handwriting-custom-head">
                      <div>
                        <div className="pdf-to-handwriting-custom-title">
                          Your Handwriting
                        </div>

                        <div className="pdf-to-handwriting-custom-copy">
                          Upload a handwriting
                          sample so KAIZEN can
                          analyze its visual
                          characteristics.
                        </div>
                      </div>

                      {style ===
                        "custom" && (
                        <span className="pdf-to-handwriting-style-check" style={{ position: "static", flex: "0 0 auto" }}>
                          ✓
                        </span>
                      )}
                    </div>

                    {!handwritingSample ? (
                      <div
                        className={`pdf-to-handwriting-sample-upload ${
                          sampleDragActive
                            ? "active"
                            : ""
                        }`}
                        onDragOver={(
                          event
                        ) => {
                          event.preventDefault();
                          setSampleDragActive(
                            true
                          );
                        }}
                        onDragLeave={() =>
                          setSampleDragActive(
                            false
                          )
                        }
                        onDrop={
                          handleSampleDrop
                        }
                      >
                        {sampleStatus ===
                        "loading" ? (
                          <>
                            <div className="pdf-to-handwriting-loader" />

                            <strong>
                              Analyzing handwriting…
                            </strong>
                          </>
                        ) : (
                          <>
                            <strong>
                              Add a handwriting sample
                            </strong>

                            <span>
                              PNG, JPG, JPEG or
                              WebP · ideally
                              several lines
                            </span>

                            <label className="pdf-to-handwriting-sample-button">
                              Choose Sample

                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                                onChange={
                                  handleSampleInput
                                }
                              />
                            </label>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="pdf-to-handwriting-sample-file">
                        <div className="pdf-to-handwriting-sample-file-icon">
                          IMG
                        </div>

                        <div className="pdf-to-handwriting-sample-file-info">
                          <strong>
                            {
                              handwritingSample.name
                            }
                          </strong>

                          <span>
                            {customProfile
                              ? "Sample analyzed successfully"
                              : "Ready for analysis"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="pdf-to-handwriting-sample-remove"
                          onClick={
                            removeSample
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                          aria-label="Remove handwriting sample"
                        >
                          ×
                        </button>
                      </div>
                    )}

                    {sampleStatus ===
                      "ready" &&
                      customProfile && (
                        <div className="pdf-to-handwriting-sample-status ready">
                          Handwriting characteristics
                          detected. Custom profile is
                          ready.
                        </div>
                      )}

                    {sampleStatus ===
                      "error" &&
                      sampleError && (
                        <div className="pdf-to-handwriting-sample-error">
                          {sampleError}
                        </div>
                      )}
                  </div>
                </div>

                <div className="pdf-to-handwriting-section">
                  <h3 className="pdf-to-handwriting-section-title">
                    PAPER & OUTPUT
                  </h3>

                  <div className="pdf-to-handwriting-options">
                    <div className="pdf-to-handwriting-field">
                      <label>
                        PAPER STYLE
                      </label>

                      <select
                        value={
                          paperStyle
                        }
                        onChange={(
                          event
                        ) =>
                          setPaperStyle(
                            event.target
                              .value
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      >
                        <option value="plain">
                          Plain Paper
                        </option>

                        <option value="lined">
                          Lined Notebook
                        </option>

                        <option value="grid">
                          Grid Paper
                        </option>

                        <option value="journal">
                          Journal
                        </option>
                      </select>
                    </div>

                    <div className="pdf-to-handwriting-field">
                      <label>
                        RENDER QUALITY
                      </label>

                      <select
                        value={
                          renderScale
                        }
                        onChange={(
                          event
                        ) =>
                          setRenderScale(
                            Number(
                              event.target
                                .value
                            )
                          )
                        }
                        disabled={
                          status ===
                          "processing"
                        }
                      >
                        <option value="1">
                          Standard · 1×
                        </option>

                        <option value="1.5">
                          High · 1.5×
                        </option>

                        <option value="2">
                          Very High · 2×
                        </option>

                        <option value="2.5">
                          Ultra · 2.5×
                        </option>

                        <option value="3">
                          Maximum · 3×
                        </option>
                      </select>
                    </div>

                    <div className="pdf-to-handwriting-field pdf-to-handwriting-range">
                      <label>
                        INK INTENSITY
                      </label>

                      <div className="pdf-to-handwriting-range-row">
                        <input
                          type="range"
                          min="0.7"
                          max="1.15"
                          step="0.01"
                          value={
                            userIntensity
                          }
                          onChange={(
                            event
                          ) =>
                            setUserIntensity(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />

                        <span className="pdf-to-handwriting-range-value">
                          {Math.round(
                            userIntensity *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="pdf-to-handwriting-field pdf-to-handwriting-range">
                      <label>
                        SLANT
                      </label>

                      <div className="pdf-to-handwriting-range-row">
                        <input
                          type="range"
                          min="-4"
                          max="4"
                          step="0.5"
                          value={
                            userSlant
                          }
                          onChange={(
                            event
                          ) =>
                            setUserSlant(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />

                        <span className="pdf-to-handwriting-range-value">
                          {userSlant > 0
                            ? `+${userSlant}°`
                            : `${userSlant}°`}
                        </span>
                      </div>
                    </div>

                    <div className="pdf-to-handwriting-field pdf-to-handwriting-range">
                      <label>
                        TEXTURE
                      </label>

                      <div className="pdf-to-handwriting-range-row">
                        <input
                          type="range"
                          min="0"
                          max="0.4"
                          step="0.01"
                          value={
                            userTexture
                          }
                          onChange={(
                            event
                          ) =>
                            setUserTexture(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />

                        <span className="pdf-to-handwriting-range-value">
                          {Math.round(
                            userTexture *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    <div className="pdf-to-handwriting-field pdf-to-handwriting-range">
                      <label>
                        NATURAL VARIATION
                      </label>

                      <div className="pdf-to-handwriting-range-row">
                        <input
                          type="range"
                          min="0"
                          max="0.4"
                          step="0.01"
                          value={
                            userJitter
                          }
                          onChange={(
                            event
                          ) =>
                            setUserJitter(
                              Number(
                                event.target
                                  .value
                              )
                            )
                          }
                          disabled={
                            status ===
                            "processing"
                          }
                        />

                        <span className="pdf-to-handwriting-range-value">
                          {Math.round(
                            userJitter *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pdf-to-handwriting-card">
                <h3 className="pdf-to-handwriting-preview-title">
                  LIVE PREVIEW
                </h3>

                <div className="pdf-to-handwriting-preview-wrap">
                  <div
                    className={`pdf-to-handwriting-paper ${paperStyle}`}
                    style={{
                      transform:
                        `rotate(${
                          style ===
                          "casual"
                            ? "-0.25deg"
                            : style ===
                              "elegant"
                            ? "0.2deg"
                            : "0deg"
                        })`,
                    }}
                  >
                    <div className="pdf-to-handwriting-paper-header">
                      KAIZEN · HANDWRITTEN DOCUMENT
                    </div>

                    <h2
                      className="pdf-to-handwriting-paper-title"
                      style={{
                        transform:
                          `skewX(${
                            style ===
                            "elegant"
                              ? "-1deg"
                              : style ===
                                "casual"
                              ? "-0.5deg"
                              : "0deg"
                          })`,
                      }}
                    >
                      Meeting Notes
                    </h2>

                    <div className="pdf-to-handwriting-paper-line" />

                    <div
                      className="pdf-to-handwriting-paper-body"
                      style={{
                        opacity:
                          style ===
                          "neat"
                            ? 0.84
                            : style ===
                              "marker"
                            ? 0.92
                            : 0.78,
                        letterSpacing:
                          style ===
                          "casual"
                            ? "0.15px"
                            : "0px",
                        fontWeight:
                          style ===
                          "marker"
                            ? 700
                            : 500,
                        transform:
                          `skewX(${
                            userSlant *
                            0.2
                          }deg)`,
                      }}
                    >
                      <p>
                        Today we discussed the
                        project timeline, upcoming
                        milestones and the tasks
                        that need to be completed.
                      </p>

                      <p>
                        The next step is to review
                        the updated design and make
                        the final adjustments.
                      </p>

                      <p>
                        Remember to share the
                        progress with the team before
                        the next meeting.
                      </p>
                    </div>

                    <div className="pdf-to-handwriting-paper-footer">
                      <span>
                        {previewStyleName}
                      </span>

                      <span>
                        Page 1
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pdf-to-handwriting-preview-badge">
                  Style:{" "}
                  {previewStyleName}
                  {" · "}
                  {paperStyle ===
                  "plain"
                    ? "Plain"
                    : paperStyle ===
                      "lined"
                    ? "Lined"
                    : paperStyle ===
                      "grid"
                    ? "Grid"
                    : "Journal"}
                </div>
              </div>
            </div>

            <div className="pdf-to-handwriting-actions">
              <button
                type="button"
                className="pdf-to-handwriting-primary"
                onClick={
                  handleConvert
                }
                disabled={
                  status ===
                  "processing"
                }
              >
                {status ===
                "processing"
                  ? `Creating Handwriting · ${progress}%`
                  : "Convert to Handwriting"}
              </button>

              <button
                type="button"
                className="pdf-to-handwriting-secondary"
                onClick={resetTool}
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
              <div className="pdf-to-handwriting-progress">
                <div className="pdf-to-handwriting-progress-head">
                  <span>
                    Processing PDF
                  </span>

                  <span>
                    {progress}%
                  </span>
                </div>

                <div className="pdf-to-handwriting-progress-track">
                  <div
                    className="pdf-to-handwriting-progress-bar"
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
                <div className="pdf-to-handwriting-result">
                  <strong>
                    Handwriting PDF created
                    successfully.
                  </strong>

                  <span>
                    {resultName}
                  </span>

                  <a
                    className="pdf-to-handwriting-download"
                    href={resultUrl}
                    download={
                      resultName
                    }
                  >
                    Download PDF
                  </a>
                </div>
              )}

            {status === "error" &&
              error && (
                <div className="pdf-to-handwriting-error">
                  {error}
                </div>
              )}
          </>
        )}
      </div>
    </div>
  );
}

export default PdfToHandwriting;