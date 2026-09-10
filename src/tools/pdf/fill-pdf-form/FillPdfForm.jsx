import { useEffect, useMemo, useState } from "react";
import {
  createEmptyFormValues,
  fillPdfForm,
  getFillPdfFormInfo,
} from "../../../services/pdf/fillPdfForm.js";

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFieldTypeLabel(type) {
  switch (type) {
    case "text":
      return "Text";

    case "checkbox":
      return "Checkbox";

    case "dropdown":
      return "Dropdown";

    case "radio":
      return "Radio";

    case "optionlist":
      return "Option list";

    default:
      return "Unknown";
  }
}

function FillPdfForm() {
  const [file, setFile] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);

  const [values, setValues] = useState({});

  const [flatten, setFlatten] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  const [pdfUrl, setPdfUrl] =
    useState("");

  const [resultUrl, setResultUrl] =
    useState("");

  const filteredFields = useMemo(() => {
    if (!pdfInfo?.fields) {
      return [];
    }

    const query =
      search.trim().toLowerCase();

    if (!query) {
      return pdfInfo.fields;
    }

    return pdfInfo.fields.filter(
      (field) =>
        field.name
          .toLowerCase()
          .includes(query) ||
        field.type
          .toLowerCase()
          .includes(query)
    );
  }, [pdfInfo, search]);

  const filledFieldCount = useMemo(() => {
    if (!pdfInfo?.fields) {
      return 0;
    }

    return pdfInfo.fields.filter(
      (field) => {
        const value =
          values[field.name];

        if (field.type === "checkbox") {
          return value === true;
        }

        return (
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
        );
      }
    ).length;
  }, [pdfInfo, values]);

  useEffect(() => {
    if (!file) {
      setPdfUrl("");
      return;
    }

    const url =
      URL.createObjectURL(file);

    setPdfUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    return () => {
      if (resultUrl) {
        URL.revokeObjectURL(resultUrl);
      }
    };
  }, [resultUrl]);

  useEffect(() => {
    if (!file) {
      return;
    }

    let cancelled = false;

    async function inspectPdf() {
      setIsLoading(true);
      setError("");
      setPdfInfo(null);
      setValues({});
      setResult(null);
      setProgress(0);

      try {
        const info =
          await getFillPdfFormInfo(file);

        if (cancelled) {
          return;
        }

        setPdfInfo(info);

        setValues(
          createEmptyFormValues(
            info.fields
          )
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError?.message ||
              "Unable to inspect this PDF form."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    inspectPdf();

    return () => {
      cancelled = true;
    };
  }, [file]);

  function handleFile(selectedFile) {
    setError("");
    setResult(null);
    setProgress(0);

    if (
      !selectedFile ||
      selectedFile.type !==
        "application/pdf"
    ) {
      setFile(null);
      setPdfInfo(null);
      setValues({});
      setError(
        "Please select a valid PDF file."
      );
      return;
    }

    setFile(selectedFile);
  }

  function updateField(
    fieldName,
    value
  ) {
    setValues((previous) => ({
      ...previous,
      [fieldName]: value,
    }));

    setError("");
  }

  function clearAllFields() {
    if (!pdfInfo?.fields) {
      return;
    }

    setValues(
      createEmptyFormValues(
        pdfInfo.fields
      )
    );

    setError("");
    setResult(null);
  }

  async function handleFillForm() {
    if (!file) {
      setError(
        "Please select a PDF form first."
      );
      return;
    }

    if (
      !pdfInfo ||
      pdfInfo.fieldCount === 0
    ) {
      setError(
        "This PDF does not contain fillable fields."
      );
      return;
    }

    if (filledFieldCount === 0) {
      setError(
        "Please fill at least one form field."
      );
      return;
    }

    setError("");
    setResult(null);
    setIsProcessing(true);
    setProgress(0);

    try {
      const processed =
        await fillPdfForm(
          file,
          values,
          {
            flatten,
            updateFieldAppearances: true,
          },
          setProgress
        );

      if (resultUrl) {
        URL.revokeObjectURL(
          resultUrl
        );
      }

      const url =
        URL.createObjectURL(
          processed.blob
        );

      setResultUrl(url);

      setResult({
        blob: processed.blob,
        pageCount:
          processed.pageCount,
        fieldCount:
          processed.fieldCount,
        filledFieldCount:
          processed.filledFieldCount,
        flattened:
          processed.flattened,
      });
    } catch (processError) {
      setError(
        processError?.message ||
          "Unable to fill this PDF form."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function resetTool() {
    if (resultUrl) {
      URL.revokeObjectURL(
        resultUrl
      );
    }

    setFile(null);
    setPdfInfo(null);
    setValues({});
    setFlatten(false);
    setSearch("");
    setIsLoading(false);
    setIsProcessing(false);
    setProgress(0);
    setError("");
    setResult(null);
    setPdfUrl("");
    setResultUrl("");
  }

  return (
    <div className="fill-pdf-form">
      {!file && (
        <div className="fill-pdf-upload">
          <div className="fill-pdf-upload-icon">
            ▤
          </div>

          <h2>
            Fill your PDF form
          </h2>

          <p>
            Automatically detect the
            fillable fields in your PDF
            and complete them in one
            place.
          </p>

          <label className="fill-pdf-upload-button">
            Choose PDF
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const selectedFile =
                  event.target.files?.[0];

                if (selectedFile) {
                  handleFile(
                    selectedFile
                  );
                }

                event.target.value =
                  "";
              }}
            />
          </label>

          <span className="fill-pdf-upload-hint">
            or drag and drop a PDF
          </span>

          {error && (
            <div className="fill-pdf-upload-error">
              {error}
            </div>
          )}
        </div>
      )}

      {file && (
        <>
          <div className="fill-pdf-toolbar">
            <div className="fill-pdf-file">
              <div className="fill-pdf-file-icon">
                PDF
              </div>

              <div>
                <strong>
                  {file.name}
                </strong>

                <span>
                  {formatFileSize(
                    file.size
                  )}
                </span>
              </div>
            </div>

            <div className="fill-pdf-toolbar-stats">
              <div>
                <strong>
                  {pdfInfo?.fieldCount ??
                    "—"}
                </strong>

                <span>
                  fields
                </span>
              </div>

              <div>
                <strong>
                  {filledFieldCount}
                </strong>

                <span>
                  filled
                </span>
              </div>
            </div>

            <button
              type="button"
              className="fill-pdf-change-button"
              onClick={resetTool}
              disabled={
                isLoading ||
                isProcessing
              }
            >
              Change PDF
            </button>
          </div>

          {isLoading ? (
            <div className="fill-pdf-loading">
              <div className="fill-pdf-loading-spinner" />

              <h3>
                Inspecting your form
              </h3>

              <p>
                Looking for fillable PDF
                fields...
              </p>
            </div>
          ) : (
            <div className="fill-pdf-editor">
              <aside className="fill-pdf-sidebar">
                <section className="fill-pdf-section">
                  <span className="fill-pdf-label">
                    FORM FIELDS
                  </span>

                  <div className="fill-pdf-search">
                    <span>⌕</span>

                    <input
                      type="text"
                      value={search}
                      onChange={(
                        event
                      ) =>
                        setSearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Search fields..."
                      disabled={
                        isProcessing
                      }
                    />
                  </div>

                  {pdfInfo &&
                    pdfInfo.fieldCount ===
                      0 && (
                      <div className="fill-pdf-no-fields">
                        This PDF doesn't
                        contain interactive
                        form fields.
                      </div>
                    )}

                  <div className="fill-pdf-field-list">
                    {filteredFields.map(
                      (field) => {
                        const fieldValue =
                          values[
                            field.name
                          ];

                        return (
                          <div
                            key={
                              field.name
                            }
                            className="fill-pdf-field-card"
                          >
                            <div className="fill-pdf-field-heading">
                              <div>
                                <strong>
                                  {
                                    field.name
                                  }
                                </strong>

                                <span>
                                  {getFieldTypeLabel(
                                    field.type
                                  )}
                                </span>
                              </div>

                              <span
                                className={
                                  field.type ===
                                  "checkbox"
                                    ? fieldValue
                                      ? "filled"
                                      : ""
                                    : fieldValue !==
                                        undefined &&
                                      fieldValue !==
                                        null &&
                                      String(
                                        fieldValue
                                      ).trim()
                                        ? "filled"
                                        : ""
                                }
                              />
                            </div>

                            {field.type ===
                              "text" && (
                              <input
                                type="text"
                                value={
                                  fieldValue ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateField(
                                    field.name,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Enter value..."
                                disabled={
                                  isProcessing
                                }
                              />
                            )}

                            {field.type ===
                              "checkbox" && (
                              <label className="fill-pdf-checkbox">
                                <input
                                  type="checkbox"
                                  checked={
                                    Boolean(
                                      fieldValue
                                    )
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateField(
                                      field.name,
                                      event.target
                                        .checked
                                    )
                                  }
                                  disabled={
                                    isProcessing
                                  }
                                />

                                <span className="fill-pdf-checkbox-box">
                                  {fieldValue
                                    ? "✓"
                                    : ""}
                                </span>

                                <span>
                                  {fieldValue
                                    ? "Checked"
                                    : "Not checked"}
                                </span>
                              </label>
                            )}

                            {(field.type ===
                              "dropdown" ||
                              field.type ===
                                "optionlist" ||
                              field.type ===
                                "radio") && (
                              <input
                                type="text"
                                value={
                                  fieldValue ??
                                  ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateField(
                                    field.name,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder={
                                  field.type ===
                                  "radio"
                                    ? "Enter selected option..."
                                    : "Enter option value..."
                                }
                                disabled={
                                  isProcessing
                                }
                              />
                            )}

                            {field.type ===
                              "unknown" && (
                              <div className="fill-pdf-unsupported">
                                Unsupported field
                                type
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}

                    {filteredFields.length ===
                      0 &&
                      pdfInfo?.fieldCount >
                        0 && (
                        <div className="fill-pdf-empty-search">
                          No matching fields.
                        </div>
                      )}
                  </div>
                </section>

                <section className="fill-pdf-section">
                  <span className="fill-pdf-label">
                    OPTIONS
                  </span>

                  <label className="fill-pdf-flatten">
                    <input
                      type="checkbox"
                      checked={
                        flatten
                      }
                      onChange={(
                        event
                      ) =>
                        setFlatten(
                          event.target
                            .checked
                        )
                      }
                      disabled={
                        isProcessing
                      }
                    />

                    <span className="fill-pdf-switch">
                      <span />
                    </span>

                    <div>
                      <strong>
                        Flatten form
                      </strong>

                      <small>
                        Make entered values
                        non-editable in
                        the output PDF.
                      </small>
                    </div>
                  </label>
                </section>

                <section className="fill-pdf-section">
                  <button
                    type="button"
                    className="fill-pdf-clear-button"
                    onClick={
                      clearAllFields
                    }
                    disabled={
                      isProcessing ||
                      filledFieldCount ===
                        0
                    }
                  >
                    Clear all fields
                  </button>
                </section>

                {error && (
                  <div className="fill-pdf-error">
                    {error}
                  </div>
                )}
              </aside>

              <main className="fill-pdf-preview-area">
                <div className="fill-pdf-preview-header">
                  <div>
                    <span className="fill-pdf-label">
                      DOCUMENT PREVIEW
                    </span>

                    <p>
                      Your original form
                      remains unchanged.
                    </p>
                  </div>
                </div>

                <div className="fill-pdf-page-stage">
                  <div className="fill-pdf-page-shell">
                    {pdfUrl && (
                      <iframe
                        title="PDF form preview"
                        src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                        className="fill-pdf-preview"
                      />
                    )}

                    <div className="fill-pdf-preview-overlay">
                      {pdfInfo?.fieldCount >
                        0 && (
                        <div className="fill-pdf-preview-badge">
                          {
                            pdfInfo.fieldCount
                          }{" "}
                          fillable{" "}
                          {pdfInfo.fieldCount ===
                          1
                            ? "field"
                            : "fields"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="fill-pdf-preview-hint">
                  Fill the detected fields
                  from the panel on the left.
                </div>
              </main>
            </div>
          )}

          {!isLoading && (
            <div className="fill-pdf-bottom">
              <div className="fill-pdf-summary">
                <span>
                  {filledFieldCount} of{" "}
                  {pdfInfo?.fieldCount ??
                    0}{" "}
                  fields filled
                </span>

                <span>•</span>

                <span>
                  {flatten
                    ? "Output will be flattened"
                    : "Form remains editable"}
                </span>
              </div>

              {isProcessing ? (
                <div className="fill-pdf-progress">
                  <div className="fill-pdf-progress-header">
                    <span>
                      Filling PDF form
                    </span>

                    <strong>
                      {progress}%
                    </strong>
                  </div>

                  <div className="fill-pdf-progress-track">
                    <div
                      className="fill-pdf-progress-fill"
                      style={{
                        width: `${progress}%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="fill-pdf-process-button"
                  onClick={
                    handleFillForm
                  }
                  disabled={
                    !file ||
                    !pdfInfo ||
                    pdfInfo.fieldCount ===
                      0 ||
                    filledFieldCount ===
                      0
                  }
                >
                  Fill PDF
                  <span>→</span>
                </button>
              )}
            </div>
          )}

          {result && resultUrl && (
            <div className="fill-pdf-result">
              <div>
                <span className="fill-pdf-result-label">
                  COMPLETE
                </span>

                <h3>
                  Your completed PDF is
                  ready.
                </h3>

                <p>
                  {
                    result.filledFieldCount
                  }{" "}
                  {result.filledFieldCount ===
                  1
                    ? "field"
                    : "fields"}{" "}
                  filled across{" "}
                  {result.pageCount}{" "}
                  {result.pageCount ===
                  1
                    ? "page"
                    : "pages"}.
                  {result.flattened
                    ? " The form has been flattened."
                    : " The form remains editable."}
                </p>
              </div>

              <a
                href={resultUrl}
                download={`filled-${file.name}`}
                className="fill-pdf-download-button"
              >
                Download PDF
                <span>↓</span>
              </a>
            </div>
          )}
        </>
      )}

      <style>{`
        .fill-pdf {
          width: 100%;
          color: rgba(255,255,255,0.94);
        }

        .fill-pdf-upload {
          min-height: 520px;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 28px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.075),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(20px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 48px;
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 24px 80px rgba(0,0,0,0.22);
        }

        .fill-pdf-upload-icon {
          width: 74px;
          height: 74px;
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(
              circle at center,
              rgba(255,115,35,0.38),
              rgba(255,115,35,0.08) 65%,
              transparent 75%
            );
          color: #ff8d4a;
          font-size: 30px;
          margin-bottom: 22px;
        }

        .fill-pdf-upload h2 {
          margin: 0;
          font-size: 28px;
          letter-spacing: -0.03em;
        }

        .fill-pdf-upload p {
          max-width: 510px;
          margin: 10px 0 28px;
          color: rgba(255,255,255,0.56);
          font-size: 14px;
          line-height: 1.5;
        }

        .fill-pdf-upload-button {
          cursor: pointer;
          padding: 13px 22px;
          border-radius: 14px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,150,80,0.65),
              rgba(255,94,0,0.9)
            );
          box-shadow:
            0 12px 32px rgba(255,92,0,0.22);
          font-size: 14px;
          font-weight: 700;
        }

        .fill-pdf-upload-button input {
          display: none;
        }

        .fill-pdf-upload-hint {
          margin-top: 14px;
          font-size: 12px;
          color: rgba(255,255,255,0.3);
        }

        .fill-pdf-upload-error {
          margin-top: 18px;
          padding: 9px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,80,55,0.18);
          color: #ff9b84;
          background: rgba(255,70,50,0.07);
          font-size: 10px;
        }

        .fill-pdf-toolbar {
          display: flex;
          align-items: center;
          gap: 18px;
          min-height: 72px;
          padding: 12px 14px;
          margin-bottom: 18px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.06),
              rgba(255,255,255,0.025)
            );
          backdrop-filter: blur(18px);
        }

        .fill-pdf-file {
          min-width: 220px;
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .fill-pdf-file-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #ff8b47;
          background: rgba(255,112,37,0.11);
          border: 1px solid rgba(255,123,54,0.18);
        }

        .fill-pdf-file > div:last-child {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fill-pdf-file strong {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .fill-pdf-file span {
          font-size: 10px;
          color: rgba(255,255,255,0.38);
        }

        .fill-pdf-toolbar-stats {
          flex: 1;
          display: flex;
          justify-content: center;
          gap: 34px;
        }

        .fill-pdf-toolbar-stats div {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .fill-pdf-toolbar-stats strong {
          color: #ff9658;
          font-size: 20px;
        }

        .fill-pdf-toolbar-stats span {
          color: rgba(255,255,255,0.35);
          font-size: 10px;
        }

        .fill-pdf-change-button {
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.035);
          color: rgba(255,255,255,0.68);
          border-radius: 11px;
          padding: 10px 13px;
          font-size: 12px;
          cursor: pointer;
        }

        .fill-pdf-change-button:hover {
          color: white;
          background: rgba(255,255,255,0.07);
        }

        .fill-pdf-loading {
          min-height: 610px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.018)
            );
        }

        .fill-pdf-loading-spinner {
          width: 34px;
          height: 34px;
          margin-bottom: 18px;
          border: 2px solid rgba(255,255,255,0.08);
          border-top-color: #ff7530;
          border-radius: 50%;
          animation: fillPdfSpin 0.85s linear infinite;
        }

        @keyframes fillPdfSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .fill-pdf-loading h3 {
          margin: 0;
          font-size: 16px;
        }

        .fill-pdf-loading p {
          margin: 7px 0 0;
          color: rgba(255,255,255,0.35);
          font-size: 11px;
        }

        .fill-pdf-editor {
          display: grid;
          grid-template-columns: 350px minmax(0,1fr);
          min-height: 650px;
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 24px;
          overflow: hidden;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.055),
              rgba(255,255,255,0.018)
            );
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 20px 60px rgba(0,0,0,0.18);
        }

        .fill-pdf-sidebar {
          padding: 20px;
          overflow-y: auto;
          border-right: 1px solid rgba(255,255,255,0.07);
          background: rgba(7,7,7,0.24);
        }

        .fill-pdf-section {
          padding-bottom: 20px;
          margin-bottom: 20px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .fill-pdf-section:last-child {
          border-bottom: 0;
          margin-bottom: 0;
        }

        .fill-pdf-label {
          display: block;
          margin-bottom: 10px;
          color: rgba(255,255,255,0.32);
          font-size: 9px;
          letter-spacing: 0.18em;
          font-weight: 800;
        }

        .fill-pdf-search {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 36px;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          background: rgba(0,0,0,0.18);
        }

        .fill-pdf-search span {
          color: rgba(255,255,255,0.28);
          font-size: 18px;
        }

        .fill-pdf-search input {
          min-width: 0;
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: white;
          font-size: 11px;
        }

        .fill-pdf-search input::placeholder {
          color: rgba(255,255,255,0.24);
        }

        .fill-pdf-field-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .fill-pdf-field-card {
          padding: 11px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 12px;
          background: rgba(255,255,255,0.025);
        }

        .fill-pdf-field-card:focus-within {
          border-color: rgba(255,113,40,0.28);
          background: rgba(255,106,30,0.035);
        }

        .fill-pdf-field-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .fill-pdf-field-heading > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fill-pdf-field-heading strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .fill-pdf-field-heading div span {
          color: rgba(255,255,255,0.28);
          font-size: 8px;
        }

        .fill-pdf-field-heading > span {
          flex: 0 0 auto;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
        }

        .fill-pdf-field-heading > span.filled {
          background: #65d996;
          box-shadow: 0 0 10px rgba(101,217,150,0.35);
        }

        .fill-pdf-field-card > input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 8px;
          padding: 8px;
          outline: 0;
          background: rgba(0,0,0,0.18);
          color: white;
          font-size: 10px;
        }

        .fill-pdf-field-card > input:focus {
          border-color: rgba(255,114,42,0.38);
        }

        .fill-pdf-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255,255,255,0.48);
          font-size: 10px;
          cursor: pointer;
        }

        .fill-pdf-checkbox input {
          display: none;
        }

        .fill-pdf-checkbox-box {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 5px;
          color: white;
          background: rgba(255,255,255,0.03);
          font-size: 11px;
        }

        .fill-pdf-checkbox input:checked
          + .fill-pdf-checkbox-box {
          border-color: rgba(255,114,42,0.5);
          background: #ff6b24;
        }

        .fill-pdf-unsupported {
          padding: 8px;
          border-radius: 7px;
          color: #ffad99;
          background: rgba(255,80,55,0.06);
          font-size: 9px;
        }

        .fill-pdf-no-fields,
        .fill-pdf-empty-search {
          margin-top: 12px;
          padding: 11px;
          border-radius: 10px;
          color: rgba(255,255,255,0.32);
          background: rgba(255,255,255,0.025);
          font-size: 10px;
          line-height: 1.45;
        }

        .fill-pdf-flatten {
          display: grid;
          grid-template-columns: 1px 34px minmax(0,1fr);
          align-items: center;
          gap: 9px;
          cursor: pointer;
        }

        .fill-pdf-flatten input {
          display: none;
        }

        .fill-pdf-switch {
          width: 34px;
          height: 20px;
          padding: 2px;
          box-sizing: border-box;
          border-radius: 999px;
          background: rgba(255,255,255,0.09);
          transition: background 0.18s ease;
        }

        .fill-pdf-switch span {
          display: block;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(255,255,255,0.52);
          transition: transform 0.18s ease;
        }

        .fill-pdf-flatten input:checked
          + .fill-pdf-switch {
          background: #ff6b24;
        }

        .fill-pdf-flatten input:checked
          + .fill-pdf-switch span {
          transform: translateX(14px);
          background: white;
        }

        .fill-pdf-flatten > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .fill-pdf-flatten strong {
          color: rgba(255,255,255,0.7);
          font-size: 10px;
        }

        .fill-pdf-flatten small {
          color: rgba(255,255,255,0.28);
          font-size: 8px;
          line-height: 1.4;
        }

        .fill-pdf-clear-button {
          width: 100%;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          color: rgba(255,255,255,0.45);
          padding: 9px;
          border-radius: 9px;
          font-size: 10px;
          cursor: pointer;
        }

        .fill-pdf-clear-button:hover {
          color: white;
          background: rgba(255,255,255,0.06);
        }

        .fill-pdf-clear-button:disabled {
          opacity: 0.25;
          cursor: not-allowed;
        }

        .fill-pdf-error {
          margin-top: 15px;
          padding: 10px 11px;
          border: 1px solid rgba(255,80,55,0.18);
          border-radius: 10px;
          background: rgba(255,70,50,0.07);
          color: #ff9b84;
          font-size: 10px;
          line-height: 1.45;
        }

        .fill-pdf-preview-area {
          min-width: 0;
          display: flex;
          flex-direction: column;
          background:
            radial-gradient(
              circle at 50% 30%,
              rgba(255,111,37,0.045),
              transparent 38%
            ),
            #090909;
        }

        .fill-pdf-preview-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 17px 20px 0;
        }

        .fill-pdf-preview-header .fill-pdf-label {
          margin-bottom: 4px;
        }

        .fill-pdf-preview-header p {
          margin: 0;
          color: rgba(255,255,255,0.28);
          font-size: 9px;
        }

        .fill-pdf-page-stage {
          flex: 1;
          min-height: 560px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 30px;
          overflow: auto;
        }

        .fill-pdf-page-shell {
          position: relative;
          width: min(100%, 740px);
          aspect-ratio: 0.707;
          background: white;
          border-radius: 2px;
          overflow: hidden;
          box-shadow:
            0 24px 60px rgba(0,0,0,0.45);
        }

        .fill-pdf-preview {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          border: 0;
          background: white;
        }

        .fill-pdf-preview-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .fill-pdf-preview-badge {
          position: absolute;
          top: 13px;
          right: 13px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #fff;
          background: rgba(13,13,13,0.74);
          backdrop-filter: blur(8px);
          font-size: 8px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }

        .fill-pdf-preview-hint {
          padding: 11px 18px 14px;
          text-align: center;
          color: rgba(255,255,255,0.28);
          font-size: 10px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .fill-pdf-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-top: 16px;
          padding: 15px 2px 0;
        }

        .fill-pdf-summary {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(255,255,255,0.38);
          font-size: 11px;
        }

        .fill-pdf-process-button,
        .fill-pdf-download-button {
          border: 0;
          border-radius: 13px;
          padding: 12px 17px;
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: white;
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(255,154,94,0.85),
              #ff5e0b
            );
          box-shadow:
            0 10px 28px rgba(255,83,0,0.2);
        }

        .fill-pdf-process-button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
          box-shadow: none;
        }

        .fill-pdf-progress {
          width: min(380px, 45%);
        }

        .fill-pdf-progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 7px;
          color: rgba(255,255,255,0.45);
          font-size: 10px;
        }

        .fill-pdf-progress-header strong {
          color: #ff985b;
        }

        .fill-pdf-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,0.08);
        }

        .fill-pdf-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(
            90deg,
            #ff5310,
            #ff9b5b
          );
          transition:
            width 0.2s ease;
        }

        .fill-pdf-result {
          margin-top: 18px;
          padding: 20px 22px;
          border: 1px solid rgba(102,255,170,0.12);
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(102,255,170,0.045),
              rgba(255,255,255,0.025)
            );
        }

        .fill-pdf-result-label {
          color: #8de0ad;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
        }

        .fill-pdf-result h3 {
          margin: 6px 0 4px;
          font-size: 15px;
        }

        .fill-pdf-result p {
          margin: 0;
          color: rgba(255,255,255,0.42);
          font-size: 10px;
          line-height: 1.4;
        }

        @media (max-width: 1050px) {
          .fill-pdf-editor {
            grid-template-columns: 310px minmax(0,1fr);
          }

          .fill-pdf-file {
            min-width: 180px;
          }

          .fill-pdf-toolbar-stats {
            gap: 18px;
          }
        }

        @media (max-width: 850px) {
          .fill-pdf-editor {
            grid-template-columns: 1fr;
          }

          .fill-pdf-sidebar {
            border-right: 0;
            border-bottom: 1px solid rgba(255,255,255,0.07);
          }

          .fill-pdf-page-stage {
            min-height: 500px;
          }

          .fill-pdf-toolbar {
            flex-wrap: wrap;
          }

          .fill-pdf-toolbar-stats {
            order: 3;
            width: 100%;
            justify-content: flex-start;
          }
        }

        @media (max-width: 620px) {
          .fill-pdf-upload {
            min-height: 400px;
            padding: 28px;
          }

          .fill-pdf-page-stage {
            padding: 12px;
            min-height: 430px;
          }

          .fill-pdf-bottom,
          .fill-pdf-result {
            align-items: flex-start;
            flex-direction: column;
          }

          .fill-pdf-progress {
            width: 100%;
          }

          .fill-pdf-process-button,
          .fill-pdf-download-button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

export default FillPdfForm;