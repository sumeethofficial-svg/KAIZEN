import {
  useEffect,
  useRef,
  useState,
} from "react";
import { joinAudio } from "../../services/audio/joinAudio";

const FORMAT_OPTIONS = [
  {
    value: "mp3",
    label: "MP3",
    description: "Best compatibility",
  },
  {
    value: "m4a",
    label: "M4A",
    description: "Efficient high quality",
  },
  {
    value: "wav",
    label: "WAV",
    description: "Uncompressed audio",
  },
  {
    value: "ogg",
    label: "OGG",
    description: "Open audio format",
  },
];

const formatBytes = (bytes) => {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) / Math.log(1024)
    ),
    units.length - 1
  );

  const value =
    bytes / 1024 ** index;

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
};

const formatDuration = (seconds) => {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "00:00";
  }

  const totalSeconds = Math.round(
    seconds
  );

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const remaining =
    totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(
      minutes
    ).padStart(2, "0")}:${String(
      remaining
    ).padStart(2, "0")}`;
  }

  return `${minutes}:${String(
    remaining
  ).padStart(2, "0")}`;
};

const getAudioDuration = (file) =>
  new Promise((resolve) => {
    const url =
      URL.createObjectURL(file);

    const audio =
      document.createElement("audio");

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      const duration =
        Number.isFinite(
          audio.duration
        )
          ? audio.duration
          : 0;

      URL.revokeObjectURL(url);
      resolve(duration);
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };

    audio.src = url;
  });

export default function JoinAudio() {
  const inputRef =
    useRef(null);

  const resultUrlRef =
    useRef(null);

  const abortControllerRef =
    useRef(null);

  const [files, setFiles] =
    useState([]);

  const [format, setFormat] =
    useState("mp3");

  const [dragActive, setDragActive] =
    useState(false);

  const [stage, setStage] =
    useState("idle");

  const [progress, setProgress] =
    useState(0);

  const [result, setResult] =
    useState(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();

      if (resultUrlRef.current) {
        URL.revokeObjectURL(
          resultUrlRef.current
        );
      }

      for (const item of files) {
        if (item.previewUrl) {
          URL.revokeObjectURL(
            item.previewUrl
          );
        }
      }
    };
  }, [files]);

  const clearResult = () => {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current = null;
    }

    setResult(null);
  };

  const addFiles = async (
    selectedFiles
  ) => {
    const incoming = Array.from(
      selectedFiles || []
    );

    if (!incoming.length) {
      return;
    }

    const valid = incoming.filter(
      (file) => {
        return (
          file.size > 0 &&
          (
            file.type.startsWith(
              "audio/"
            ) ||
            /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|wma|aiff|aif|alac)$/i.test(
              file.name
            )
          )
        );
      }
    );

    if (!valid.length) {
      setError(
        "No valid audio files were selected."
      );

      setStage("error");

      return;
    }

    clearResult();
    setError("");

    const prepared =
      await Promise.all(
        valid.map(
          async (file) => ({
            id:
              `${file.name}-${file.lastModified}-${Math.random()}`,
            file,
            duration:
              await getAudioDuration(
                file
              ),
            previewUrl:
              URL.createObjectURL(
                file
              ),
          })
        )
      );

    setFiles((current) => [
      ...current,
      ...prepared,
    ]);

    setStage("ready");
  };

  const handleInputChange = (
    event
  ) => {
    addFiles(
      event.target.files
    );

    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);

    addFiles(
      event.dataTransfer.files
    );
  };

  const removeFile = (id) => {
    clearResult();
    setError("");

    setFiles((current) => {
      const target =
        current.find(
          (item) =>
            item.id === id
        );

      if (target?.previewUrl) {
        URL.revokeObjectURL(
          target.previewUrl
        );
      }

      const next =
        current.filter(
          (item) =>
            item.id !== id
        );

      setStage(
        next.length >= 2
          ? "ready"
          : "idle"
      );

      return next;
    });
  };

  const moveFile = (
    index,
    direction
  ) => {
    clearResult();

    setFiles((current) => {
      const targetIndex =
        index + direction;

      if (
        targetIndex < 0 ||
        targetIndex >=
          current.length
      ) {
        return current;
      }

      const next = [
        ...current,
      ];

      [
        next[index],
        next[targetIndex],
      ] = [
        next[targetIndex],
        next[index],
      ];

      return next;
    });
  };

  const handleJoin =
    async () => {
      if (files.length < 2) {
        setStage("error");
        setError(
          "Add at least two audio files before joining."
        );
        return;
      }

      setError("");
      setProgress(0);
      setStage("processing");

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const joined =
          await joinAudio({
            files: files.map(
              (item) =>
                item.file
            ),
            format,
            signal:
              controller.signal,
            onProgress:
              (value) => {
                setProgress(
                  value
                );
              },
          });

        resultUrlRef.current =
          joined.url;

        setResult(
          joined
        );

        setProgress(100);
        setStage("success");
      } catch (
        joinError
      ) {
        if (
          joinError?.name ===
          "AbortError"
        ) {
          setStage(
            "ready"
          );
          setProgress(0);
          return;
        }

        console.error(
          joinError
        );

        setStage("error");

        setError(
          joinError?.message ||
            "Something went wrong while joining the audio files."
        );
      } finally {
        abortControllerRef.current =
          null;
      }
    };

  const handleCancel =
    () => {
      abortControllerRef
        .current?.abort();
    };

  const handleReset = () => {
    abortControllerRef.current?.abort();

    clearResult();

    for (const item of files) {
      if (item.previewUrl) {
        URL.revokeObjectURL(
          item.previewUrl
        );
      }
    }

    setFiles([]);
    setFormat("mp3");
    setProgress(0);
    setError("");
    setStage("idle");

    if (inputRef.current) {
      inputRef.current.value =
        "";
    }
  };

  const totalDuration =
    files.reduce(
      (total, item) =>
        total +
        (item.duration || 0),
      0
    );

  const totalSize =
    files.reduce(
      (total, item) =>
        total + item.file.size,
      0
    );

  return (
    <div className="join-audio-tool">
      <div className="join-audio-header">
        <div>
          <h2>
            Join Audio
          </h2>

          <p>
            Combine multiple audio files
            into one continuous track.
          </p>
        </div>

        <div className="join-audio-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {files.length === 0 &&
        stage === "idle" && (
          <button
            type="button"
            className={`join-audio-dropzone ${
              dragActive
                ? "is-dragging"
                : ""
            }`}
            onClick={() =>
              inputRef.current?.click()
            }
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
            <div className="join-audio-upload-icon">
              +
            </div>

            <strong>
              Drop your audio files here
            </strong>

            <span>
              or click to choose multiple
              files
            </span>

            <small>
              Files are joined in the order
              shown below
            </small>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.opus,.wma,.aiff,.aif,.alac"
              onChange={
                handleInputChange
              }
              hidden
            />
          </button>
        )}

      {files.length > 0 && (
        <>
          <div className="join-audio-workspace">
            <div className="join-audio-files-card">
              <div className="join-audio-card-header">
                <div>
                  <strong>
                    Audio sequence
                  </strong>

                  <span>
                    {files.length}{" "}
                    {files.length === 1
                      ? "file"
                      : "files"}
                  </span>
                </div>

                <button
                  type="button"
                  className="join-audio-add"
                  onClick={() =>
                    inputRef.current?.click()
                  }
                  disabled={
                    stage ===
                    "processing"
                  }
                >
                  + Add files
                </button>
              </div>

              <div className="join-audio-file-list">
                {files.map(
                  (item, index) => (
                    <div
                      className="join-audio-file"
                      key={item.id}
                    >
                      <div className="join-audio-order">
                        {index + 1}
                      </div>

                      <div className="join-audio-mini-player">
                        <audio
                          src={
                            item.previewUrl
                          }
                          controls
                        />
                      </div>

                      <div className="join-audio-file-details">
                        <strong>
                          {
                            item.file
                              .name
                          }
                        </strong>

                        <span>
                          {formatBytes(
                            item.file
                              .size
                          )}{" "}
                          ·{" "}
                          {formatDuration(
                            item.duration
                          )}
                        </span>
                      </div>

                      <div className="join-audio-file-actions">
                        <button
                          type="button"
                          aria-label="Move up"
                          onClick={() =>
                            moveFile(
                              index,
                              -1
                            )
                          }
                          disabled={
                            index ===
                              0 ||
                            stage ===
                              "processing"
                          }
                        >
                          ↑
                        </button>

                        <button
                          type="button"
                          aria-label="Move down"
                          onClick={() =>
                            moveFile(
                              index,
                              1
                            )
                          }
                          disabled={
                            index ===
                              files.length -
                                1 ||
                            stage ===
                              "processing"
                          }
                        >
                          ↓
                        </button>

                        <button
                          type="button"
                          aria-label="Remove file"
                          onClick={() =>
                            removeFile(
                              item.id
                            )
                          }
                          disabled={
                            stage ===
                            "processing"
                          }
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <input
                ref={inputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.opus,.wma,.aiff,.aif,.alac"
                onChange={
                  handleInputChange
                }
                hidden
              />
            </div>

            {stage !==
              "success" && (
              <div className="join-audio-settings">
                <div className="join-audio-setting-group">
                  <label>
                    Output format
                  </label>

                  <div className="join-audio-format-grid">
                    {FORMAT_OPTIONS.map(
                      (option) => (
                        <button
                          key={
                            option.value
                          }
                          type="button"
                          className={
                            format ===
                            option.value
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setFormat(
                              option.value
                            )
                          }
                          disabled={
                            stage ===
                            "processing"
                          }
                        >
                          <strong>
                            {
                              option.label
                            }
                          </strong>

                          <span>
                            {
                              option.description
                            }
                          </span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="join-audio-summary">
                  <div>
                    <span>
                      Files
                    </span>

                    <strong>
                      {files.length}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Duration
                    </span>

                    <strong>
                      {formatDuration(
                        totalDuration
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Source size
                    </span>

                    <strong>
                      {formatBytes(
                        totalSize
                      )}
                    </strong>
                  </div>
                </div>

                <div className="join-audio-tip">
                  <span>
                    ORDER
                  </span>

                  <p>
                    Use the ↑ and ↓ controls
                    to arrange the exact order
                    of the final track.
                  </p>
                </div>
              </div>
            )}
          </div>

          {stage ===
            "processing" && (
            <div className="join-audio-progress">
              <div className="join-audio-progress-top">
                <span>
                  Joining audio…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="join-audio-progress-track">
                <div
                  className="join-audio-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="join-audio-secondary"
                onClick={
                  handleCancel
                }
              >
                Cancel
              </button>
            </div>
          )}

          {stage === "error" &&
            error && (
              <div className="join-audio-error">
                {error}
              </div>
            )}

          {stage === "success" &&
            result && (
              <div className="join-audio-success">
                <div className="join-audio-success-player">
                  <audio
                    src={
                      result.url
                    }
                    controls
                  />
                </div>

                <div className="join-audio-success-info">
                  <span>
                    JOIN COMPLETE
                  </span>

                  <strong>
                    {result.fileName}
                  </strong>

                  <small>
                    {result.inputCount}{" "}
                    files ·{" "}
                    {formatBytes(
                      result.size
                    )}
                  </small>
                </div>

                <a
                  className="join-audio-download"
                  href={
                    result.url
                  }
                  download={
                    result.fileName
                  }
                >
                  Download Audio
                </a>
              </div>
            )}

          <div className="join-audio-actions">
            {stage !==
              "success" && (
              <button
                type="button"
                className="join-audio-primary"
                onClick={
                  handleJoin
                }
                disabled={
                  stage ===
                    "processing" ||
                  files.length < 2
                }
              >
                Join{" "}
                {files.length}{" "}
                Files
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="join-audio-primary"
                onClick={() => {
                  clearResult();
                  setStage(
                    "ready"
                  );
                  setProgress(0);
                }}
              >
                Join Again
              </button>
            )}

            <button
              type="button"
              className="join-audio-secondary"
              onClick={
                handleReset
              }
              disabled={
                stage ===
                "processing"
              }
            >
              Reset
            </button>
          </div>
        </>
      )}

      <style>{`
        .join-audio-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .join-audio-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .join-audio-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .join-audio-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .join-audio-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .join-audio-dropzone {
          width: 100%;
          min-height: 300px;
          border: 1px dashed rgba(255,255,255,.16);
          border-radius: 24px;
          background: rgba(255,255,255,.025);
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          transition:
            border-color .2s ease,
            background .2s ease,
            transform .2s ease;
        }

        .join-audio-dropzone:hover,
        .join-audio-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .join-audio-dropzone:active {
          transform: scale(.995);
        }

        .join-audio-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 25px;
          font-weight: 700;
        }

        .join-audio-dropzone strong {
          font-size: 16px;
        }

        .join-audio-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .join-audio-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .join-audio-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.2fr) minmax(290px,.8fr);
          gap: 18px;
        }

        .join-audio-files-card,
        .join-audio-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .join-audio-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,.07);
        }

        .join-audio-card-header > div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .join-audio-card-header strong {
          font-size: 13px;
        }

        .join-audio-card-header span {
          color: rgba(255,255,255,.35);
          font-size: 10px;
        }

        .join-audio-add {
          min-height: 34px;
          padding: 0 11px;
          border: 1px solid rgba(255,119,0,.25);
          border-radius: 10px;
          background: rgba(255,119,0,.06);
          color: #ff8730;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .join-audio-add:hover {
          background: rgba(255,119,0,.1);
        }

        .join-audio-file-list {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .join-audio-file {
          display: grid;
          grid-template-columns: 30px minmax(150px,220px) minmax(0,1fr) auto;
          align-items: center;
          gap: 11px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.018);
        }

        .join-audio-order {
          width: 30px;
          height: 30px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.1);
          color: #ff8730;
          font-size: 11px;
          font-weight: 800;
        }

        .join-audio-mini-player {
          min-width: 0;
        }

        .join-audio-mini-player audio {
          width: 100%;
          height: 32px;
        }

        .join-audio-file-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .join-audio-file-details strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 12px;
        }

        .join-audio-file-details span {
          color: rgba(255,255,255,.35);
          font-size: 10px;
        }

        .join-audio-file-actions {
          display: flex;
          gap: 4px;
        }

        .join-audio-file-actions button {
          width: 28px;
          height: 28px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 8px;
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.6);
          cursor: pointer;
        }

        .join-audio-file-actions button:hover:not(:disabled) {
          border-color: rgba(255,119,0,.4);
          color: #ff8730;
        }

        .join-audio-file-actions button:last-child:hover:not(:disabled) {
          border-color: rgba(255,80,80,.4);
          color: #ff8b8b;
        }

        .join-audio-file-actions button:disabled {
          opacity: .3;
          cursor: not-allowed;
        }

        .join-audio-settings {
          padding: 20px;
        }

        .join-audio-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .join-audio-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .join-audio-format-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .join-audio-format-grid button {
          min-height: 68px;
          padding: 11px 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 13px;
          background: rgba(255,255,255,.025);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color .18s ease,
            background .18s ease;
        }

        .join-audio-format-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .join-audio-format-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .join-audio-format-grid button strong,
        .join-audio-format-grid button span {
          display: block;
        }

        .join-audio-format-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .join-audio-format-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .join-audio-summary {
          margin-top: 20px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
        }

        .join-audio-summary div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .join-audio-summary span {
          color: rgba(255,255,255,.35);
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: .07em;
        }

        .join-audio-summary strong {
          font-size: 12px;
        }

        .join-audio-tip {
          margin-top: 18px;
          padding: 11px 12px;
          border: 1px solid rgba(255,119,0,.12);
          border-radius: 13px;
          background: rgba(255,119,0,.035);
        }

        .join-audio-tip span {
          display: block;
          margin-bottom: 5px;
          color: #ff8730;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .09em;
        }

        .join-audio-tip p {
          margin: 0;
          color: rgba(255,255,255,.4);
          font-size: 10px;
          line-height: 1.5;
        }

        .join-audio-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .join-audio-progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .join-audio-progress-top strong {
          color: #ff8730;
        }

        .join-audio-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .join-audio-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .join-audio-progress .join-audio-secondary {
          margin-top: 12px;
        }

        .join-audio-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .join-audio-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(220px,1fr) minmax(180px,.8fr) auto;
          align-items: center;
          gap: 16px;
        }

        .join-audio-success-player audio {
          display: block;
          width: 100%;
        }

        .join-audio-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .join-audio-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .join-audio-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .join-audio-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .join-audio-primary,
        .join-audio-secondary,
        .join-audio-download {
          min-height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition:
            transform .18s ease,
            border-color .18s ease,
            background .18s ease;
        }

        .join-audio-primary,
        .join-audio-download {
          background: #ff7b20;
          color: #120c08;
        }

        .join-audio-primary:hover:not(:disabled),
        .join-audio-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .join-audio-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .join-audio-secondary:hover:not(:disabled) {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .join-audio-primary:disabled,
        .join-audio-secondary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .join-audio-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 1000px) {
          .join-audio-workspace {
            grid-template-columns: 1fr;
          }

          .join-audio-success {
            grid-template-columns: 1fr;
          }

          .join-audio-file {
            grid-template-columns: 30px minmax(130px,180px) minmax(0,1fr) auto;
          }
        }

        @media (max-width: 720px) {
          .join-audio-tool {
            padding: 22px 18px 30px;
          }

          .join-audio-header {
            flex-direction: column;
          }

          .join-audio-file {
            grid-template-columns: 30px minmax(0,1fr) auto;
          }

          .join-audio-mini-player {
            display: none;
          }

          .join-audio-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .join-audio-format-grid {
            grid-template-columns: 1fr;
          }

          .join-audio-actions {
            justify-content: stretch;
          }

          .join-audio-actions button {
            flex: 1 1 100%;
          }

          .join-audio-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}