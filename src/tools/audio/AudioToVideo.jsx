import {
  useEffect,
  useRef,
  useState,
} from "react";
import { audioToVideo } from "../../services/audio/audioToVideo";

const FORMAT_OPTIONS = [
  {
    value: "mp4",
    label: "MP4",
    description: "Best compatibility",
  },
  {
    value: "webm",
    label: "WebM",
    description: "Web-friendly",
  },
];

const BACKGROUND_OPTIONS = [
  {
    value: "dark",
    label: "KAIZEN Dark",
    description: "Dark glass-style background",
  },
  {
    value: "black",
    label: "Black",
    description: "Pure black background",
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
    return "--:--";
  }

  const totalSeconds =
    Math.round(seconds);

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

export default function AudioToVideo() {
  const audioInputRef =
    useRef(null);

  const imageInputRef =
    useRef(null);

  const audioPreviewUrlRef =
    useRef(null);

  const imagePreviewUrlRef =
    useRef(null);

  const resultUrlRef =
    useRef(null);

  const abortControllerRef =
    useRef(null);

  const [audioFile, setAudioFile] =
    useState(null);

  const [imageFile, setImageFile] =
    useState(null);

  const [audioPreviewUrl, setAudioPreviewUrl] =
    useState(null);

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState(null);

  const [duration, setDuration] =
    useState(0);

  const [format, setFormat] =
    useState("mp4");

  const [background, setBackground] =
    useState("dark");

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

      if (
        audioPreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          audioPreviewUrlRef.current
        );
      }

      if (
        imagePreviewUrlRef.current
      ) {
        URL.revokeObjectURL(
          imagePreviewUrlRef.current
        );
      }

      if (
        resultUrlRef.current
      ) {
        URL.revokeObjectURL(
          resultUrlRef.current
        );
      }
    };
  }, []);

  const clearResult = () => {
    if (
      resultUrlRef.current
    ) {
      URL.revokeObjectURL(
        resultUrlRef.current
      );

      resultUrlRef.current =
        null;
    }

    setResult(null);
  };

  const loadAudio = (file) => {
    if (!file) {
      return;
    }

    const valid =
      file.type.startsWith(
        "audio/"
      ) ||
      /\.(mp3|wav|m4a|aac|ogg|oga|flac|opus|wma|aiff|aif|alac)$/i.test(
        file.name
      );

    if (!valid) {
      setError(
        "Please select a valid audio file."
      );
      setStage("error");
      return;
    }

    if (file.size <= 0) {
      setError(
        "The selected audio file is empty."
      );
      setStage("error");
      return;
    }

    clearResult();
    setError("");

    if (
      audioPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        audioPreviewUrlRef.current
      );
    }

    const url =
      URL.createObjectURL(file);

    audioPreviewUrlRef.current =
      url;

    setAudioFile(file);
    setAudioPreviewUrl(url);
    setStage("ready");

    const audio =
      document.createElement(
        "audio"
      );

    audio.preload =
      "metadata";

    audio.onloadedmetadata =
      () => {
        setDuration(
          Number.isFinite(
            audio.duration
          )
            ? audio.duration
            : 0
        );
      };

    audio.onerror = () => {
      setDuration(0);
    };

    audio.src = url;
  };

  const loadImage = (file) => {
    if (!file) {
      return;
    }

    const valid =
      file.type.startsWith(
        "image/"
      ) ||
      /\.(jpg|jpeg|png|webp|bmp)$/i.test(
        file.name
      );

    if (!valid) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    if (
      imagePreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        imagePreviewUrlRef.current
      );
    }

    const url =
      URL.createObjectURL(file);

    imagePreviewUrlRef.current =
      url;

    setImageFile(file);
    setImagePreviewUrl(url);

    clearResult();
    setError("");

    if (audioFile) {
      setStage("ready");
    }
  };

  const handleAudioInput =
    (event) => {
      const file =
        event.target.files?.[0];

      if (file) {
        loadAudio(file);
      }

      event.target.value = "";
    };

  const handleImageInput =
    (event) => {
      const file =
        event.target.files?.[0];

      if (file) {
        loadImage(file);
      }

      event.target.value = "";
    };

  const handleDrop = (
    event
  ) => {
    event.preventDefault();
    setDragActive(false);

    const file =
      event.dataTransfer.files?.[0];

    if (file) {
      loadAudio(file);
    }
  };

  const removeImage = () => {
    if (
      imagePreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        imagePreviewUrlRef.current
      );

      imagePreviewUrlRef.current =
        null;
    }

    setImageFile(null);
    setImagePreviewUrl(null);
    clearResult();
  };

  const handleConvert =
    async () => {
      if (!audioFile) {
        setError(
          "Please select an audio file first."
        );
        setStage("error");
        return;
      }

      setError("");
      setProgress(0);
      setStage(
        "processing"
      );

      const controller =
        new AbortController();

      abortControllerRef.current =
        controller;

      try {
        const converted =
          await audioToVideo({
            audioFile,
            imageFile,
            format,
            background,
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
          converted.url;

        setResult(
          converted
        );

        setProgress(100);
        setStage("success");
      } catch (
        conversionError
      ) {
        if (
          conversionError?.name ===
          "AbortError"
        ) {
          setStage("ready");
          setProgress(0);
          return;
        }

        console.error(
          conversionError
        );

        setStage("error");

        setError(
          conversionError?.message ||
            "Something went wrong while creating the video."
        );
      } finally {
        abortControllerRef.current =
          null;
      }
    };

  const handleCancel = () => {
    abortControllerRef.current?.abort();
  };

  const handleReset = () => {
    abortControllerRef.current?.abort();

    if (
      audioPreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        audioPreviewUrlRef.current
      );

      audioPreviewUrlRef.current =
        null;
    }

    if (
      imagePreviewUrlRef.current
    ) {
      URL.revokeObjectURL(
        imagePreviewUrlRef.current
      );

      imagePreviewUrlRef.current =
        null;
    }

    clearResult();

    setAudioFile(null);
    setImageFile(null);
    setAudioPreviewUrl(null);
    setImagePreviewUrl(null);
    setDuration(0);
    setFormat("mp4");
    setBackground("dark");
    setProgress(0);
    setError("");
    setStage("idle");

    if (audioInputRef.current) {
      audioInputRef.current.value =
        "";
    }

    if (imageInputRef.current) {
      imageInputRef.current.value =
        "";
    }
  };

  const selectedFormat =
    FORMAT_OPTIONS.find(
      (item) =>
        item.value === format
    );

  return (
    <div className="audio-to-video-tool">
      <div className="audio-to-video-header">
        <div>
          <h2>
            Audio to Video
          </h2>

          <p>
            Turn an audio track into a
            shareable video with a cover
            image or clean background.
          </p>
        </div>

        <div className="audio-to-video-badge">
          BROWSER · PRIVATE
        </div>
      </div>

      {!audioFile &&
        stage === "idle" && (
          <button
            type="button"
            className={`audio-to-video-dropzone ${
              dragActive
                ? "is-dragging"
                : ""
            }`}
            onClick={() =>
              audioInputRef.current?.click()
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
            <div className="audio-to-video-upload-icon">
              ▶
            </div>

            <strong>
              Drop your audio here
            </strong>

            <span>
              or click to choose an
              audio file
            </span>

            <small>
              MP3, WAV, M4A, OGG, FLAC
              and more
            </small>

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.oga,.flac,.opus,.wma,.aiff,.aif,.alac"
              onChange={
                handleAudioInput
              }
              hidden
            />
          </button>
        )}

      {audioFile && (
        <>
          <div className="audio-to-video-workspace">
            <div className="audio-to-video-left">
              <div className="audio-to-video-audio-card">
                <div className="audio-to-video-card-label">
                  AUDIO
                </div>

                <div className="audio-to-video-audio-main">
                  <div className="audio-to-video-disc">
                    ♪
                  </div>

                  <div className="audio-to-video-audio-details">
                    <strong>
                      {audioFile.name}
                    </strong>

                    <span>
                      {formatBytes(
                        audioFile.size
                      )}{" "}
                      ·{" "}
                      {formatDuration(
                        duration
                      )}
                    </span>
                  </div>
                </div>

                <audio
                  src={
                    audioPreviewUrl
                  }
                  controls
                />
              </div>

              <div
                className={`audio-to-video-image-card ${
                  imageFile
                    ? "has-image"
                    : ""
                }`}
              >
                <div className="audio-to-video-image-header">
                  <div>
                    <div className="audio-to-video-card-label">
                      VISUAL
                    </div>

                    <strong>
                      {imageFile
                        ? "Cover image"
                        : "Optional cover"}
                    </strong>
                  </div>

                  {!imageFile && (
                    <button
                      type="button"
                      className="audio-to-video-browse"
                      onClick={() =>
                        imageInputRef.current?.click()
                      }
                    >
                      + Add image
                    </button>
                  )}
                </div>

                {imageFile ? (
                  <div className="audio-to-video-image-preview">
                    <img
                      src={
                        imagePreviewUrl
                      }
                      alt="Video cover preview"
                    />

                    <div className="audio-to-video-image-overlay">
                      <span>
                        {
                          imageFile.name
                        }
                      </span>

                      <button
                        type="button"
                        onClick={
                          removeImage
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="audio-to-video-image-empty"
                    onClick={() =>
                      imageInputRef.current?.click()
                    }
                  >
                    <div>
                      +
                    </div>

                    <strong>
                      Add a cover image
                    </strong>

                    <span>
                      Without one, KAIZEN
                      creates a clean
                      background automatically.
                    </span>
                  </button>
                )}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*,.jpg,.jpeg,.png,.webp,.bmp"
                  onChange={
                    handleImageInput
                  }
                  hidden
                />
              </div>
            </div>

            {stage !== "success" && (
              <div className="audio-to-video-settings">
                <div className="audio-to-video-setting-group">
                  <label>
                    Output format
                  </label>

                  <div className="audio-to-video-format-grid">
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

                {!imageFile && (
                  <div className="audio-to-video-setting-group audio-to-video-background-group">
                    <label>
                      Background
                    </label>

                    <div className="audio-to-video-background-grid">
                      {BACKGROUND_OPTIONS.map(
                        (option) => (
                          <button
                            key={
                              option.value
                            }
                            type="button"
                            className={
                              background ===
                              option.value
                                ? "active"
                                : ""
                            }
                            onClick={() =>
                              setBackground(
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
                )}

                <div className="audio-to-video-info">
                  <span>
                    OUTPUT
                  </span>

                  <div>
                    <strong>
                      1280 × 720
                    </strong>

                    <small>
                      30 FPS ·{" "}
                      {
                        selectedFormat?.label
                      }
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>

          {stage === "processing" && (
            <div className="audio-to-video-progress">
              <div className="audio-to-video-progress-top">
                <span>
                  Creating video…
                </span>

                <strong>
                  {progress}%
                </strong>
              </div>

              <div className="audio-to-video-progress-track">
                <div
                  className="audio-to-video-progress-fill"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="audio-to-video-secondary"
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
              <div className="audio-to-video-error">
                {error}
              </div>
            )}

          {stage === "success" &&
            result && (
              <div className="audio-to-video-success">
                <div className="audio-to-video-result-player">
                  <video
                    src={
                      result.url
                    }
                    controls
                    playsInline
                  />
                </div>

                <div className="audio-to-video-success-info">
                  <span>
                    VIDEO CREATED
                  </span>

                  <strong>
                    {result.fileName}
                  </strong>

                  <small>
                    {
                      selectedFormat?.label
                    }{" "}
                    ·{" "}
                    {formatBytes(
                      result.size
                    )}
                  </small>
                </div>

                <a
                  className="audio-to-video-download"
                  href={
                    result.url
                  }
                  download={
                    result.fileName
                  }
                >
                  Download Video
                </a>
              </div>
            )}

          <div className="audio-to-video-actions">
            {stage === "ready" && (
              <button
                type="button"
                className="audio-to-video-primary"
                onClick={
                  handleConvert
                }
              >
                Create Video
              </button>
            )}

            {stage === "error" && (
              <button
                type="button"
                className="audio-to-video-primary"
                onClick={
                  handleConvert
                }
              >
                Try Again
              </button>
            )}

            {stage === "success" && (
              <button
                type="button"
                className="audio-to-video-primary"
                onClick={() => {
                  clearResult();
                  setStage(
                    "ready"
                  );
                  setProgress(0);
                }}
              >
                Create Again
              </button>
            )}

            <button
              type="button"
              className="audio-to-video-secondary"
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
        .audio-to-video-tool {
          width: 100%;
          box-sizing: border-box;
          padding: 26px 30px 38px;
          color: rgba(255,255,255,.94);
        }

        .audio-to-video-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .audio-to-video-header h2 {
          margin: 0 0 6px;
          font-size: 26px;
          line-height: 1.15;
          letter-spacing: -.03em;
        }

        .audio-to-video-header p {
          margin: 0;
          color: rgba(255,255,255,.55);
          font-size: 14px;
        }

        .audio-to-video-badge {
          padding: 8px 11px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          color: rgba(255,255,255,.48);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          white-space: nowrap;
        }

        .audio-to-video-dropzone {
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

        .audio-to-video-dropzone:hover,
        .audio-to-video-dropzone.is-dragging {
          border-color: rgba(255,119,0,.65);
          background: rgba(255,119,0,.055);
        }

        .audio-to-video-dropzone:active {
          transform: scale(.995);
        }

        .audio-to-video-upload-icon {
          width: 48px;
          height: 48px;
          margin-bottom: 10px;
          border-radius: 16px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.12);
          color: #ff8a33;
          font-size: 20px;
          font-weight: 800;
        }

        .audio-to-video-dropzone strong {
          font-size: 16px;
        }

        .audio-to-video-dropzone span {
          color: rgba(255,255,255,.5);
          font-size: 13px;
        }

        .audio-to-video-dropzone small {
          margin-top: 8px;
          color: rgba(255,255,255,.3);
          font-size: 11px;
        }

        .audio-to-video-workspace {
          display: grid;
          grid-template-columns: minmax(0,1.2fr) minmax(290px,.8fr);
          gap: 18px;
        }

        .audio-to-video-left {
          display: grid;
          gap: 18px;
        }

        .audio-to-video-audio-card,
        .audio-to-video-image-card,
        .audio-to-video-settings {
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 22px;
          background: rgba(255,255,255,.025);
          overflow: hidden;
        }

        .audio-to-video-audio-card,
        .audio-to-video-image-card {
          padding: 18px;
        }

        .audio-to-video-card-label {
          color: rgba(255,119,0,.8);
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .audio-to-video-audio-main {
          margin-top: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .audio-to-video-disc {
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.08);
          border: 1px solid rgba(255,119,0,.16);
          color: #ff8730;
          font-size: 22px;
        }

        .audio-to-video-audio-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-to-video-audio-details strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-to-video-audio-details span {
          color: rgba(255,255,255,.4);
          font-size: 11px;
        }

        .audio-to-video-audio-card audio {
          width: 100%;
          margin-top: 18px;
        }

        .audio-to-video-image-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .audio-to-video-image-header > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-to-video-image-header strong {
          font-size: 13px;
        }

        .audio-to-video-browse {
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

        .audio-to-video-image-empty {
          width: 100%;
          min-height: 170px;
          margin-top: 14px;
          border: 1px dashed rgba(255,255,255,.11);
          border-radius: 15px;
          background: rgba(255,255,255,.015);
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          cursor: pointer;
        }

        .audio-to-video-image-empty:hover {
          border-color: rgba(255,119,0,.4);
          background: rgba(255,119,0,.035);
        }

        .audio-to-video-image-empty > div {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: rgba(255,119,0,.1);
          color: #ff8730;
          font-size: 19px;
        }

        .audio-to-video-image-empty strong {
          font-size: 12px;
        }

        .audio-to-video-image-empty span {
          max-width: 280px;
          color: rgba(255,255,255,.36);
          font-size: 10px;
          line-height: 1.45;
          text-align: center;
        }

        .audio-to-video-image-preview {
          position: relative;
          margin-top: 14px;
          overflow: hidden;
          border-radius: 15px;
          background: #090909;
        }

        .audio-to-video-image-preview img {
          display: block;
          width: 100%;
          max-height: 320px;
          object-fit: contain;
        }

        .audio-to-video-image-overlay {
          position: absolute;
          inset: auto 10px 10px 10px;
          padding: 9px 10px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 11px;
          background: rgba(0,0,0,.58);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .audio-to-video-image-overlay span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 10px;
        }

        .audio-to-video-image-overlay button {
          border: 0;
          background: none;
          color: #ff8a8a;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .audio-to-video-settings {
          padding: 20px;
        }

        .audio-to-video-setting-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .audio-to-video-setting-group label {
          color: rgba(255,255,255,.6);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .audio-to-video-format-grid,
        .audio-to-video-background-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .audio-to-video-format-grid button,
        .audio-to-video-background-grid button {
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

        .audio-to-video-format-grid button:hover,
        .audio-to-video-background-grid button:hover {
          border-color: rgba(255,119,0,.35);
        }

        .audio-to-video-format-grid button.active,
        .audio-to-video-background-grid button.active {
          border-color: rgba(255,119,0,.7);
          background: rgba(255,119,0,.08);
        }

        .audio-to-video-format-grid button strong,
        .audio-to-video-format-grid button span,
        .audio-to-video-background-grid button strong,
        .audio-to-video-background-grid button span {
          display: block;
        }

        .audio-to-video-format-grid button strong,
        .audio-to-video-background-grid button strong {
          margin-bottom: 4px;
          font-size: 13px;
        }

        .audio-to-video-format-grid button span,
        .audio-to-video-background-grid button span {
          color: rgba(255,255,255,.38);
          font-size: 10px;
          line-height: 1.35;
        }

        .audio-to-video-background-group {
          margin-top: 20px;
        }

        .audio-to-video-info {
          margin-top: 20px;
          padding: 13px;
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 14px;
          background: rgba(255,255,255,.02);
        }

        .audio-to-video-info > span {
          display: block;
          margin-bottom: 6px;
          color: #ff8730;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .audio-to-video-info > div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .audio-to-video-info strong {
          font-size: 12px;
        }

        .audio-to-video-info small {
          color: rgba(255,255,255,.36);
          font-size: 10px;
        }

        .audio-to-video-progress {
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(255,255,255,.025);
        }

        .audio-to-video-progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          font-size: 13px;
        }

        .audio-to-video-progress-top strong {
          color: #ff8730;
        }

        .audio-to-video-progress-track {
          width: 100%;
          height: 7px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255,255,255,.08);
        }

        .audio-to-video-progress-fill {
          height: 100%;
          border-radius: inherit;
          background: #ff7b20;
          transition: width .18s ease;
        }

        .audio-to-video-progress .audio-to-video-secondary {
          margin-top: 12px;
        }

        .audio-to-video-error {
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid rgba(255,75,75,.2);
          border-radius: 14px;
          background: rgba(255,75,75,.05);
          color: rgba(255,180,180,.9);
          font-size: 13px;
        }

        .audio-to-video-success {
          margin-top: 18px;
          padding: 16px;
          border: 1px solid rgba(105,255,160,.18);
          border-radius: 18px;
          background: rgba(105,255,160,.045);
          display: grid;
          grid-template-columns: minmax(280px,1.15fr) minmax(180px,.75fr) auto;
          align-items: center;
          gap: 16px;
        }

        .audio-to-video-result-player video {
          display: block;
          width: 100%;
          max-height: 300px;
          border-radius: 12px;
          background: #090909;
        }

        .audio-to-video-success-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audio-to-video-success-info span {
          color: rgba(155,255,190,.75);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        .audio-to-video-success-info strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
        }

        .audio-to-video-success-info small {
          color: rgba(255,255,255,.38);
          font-size: 11px;
        }

        .audio-to-video-primary,
        .audio-to-video-secondary,
        .audio-to-video-download {
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

        .audio-to-video-primary,
        .audio-to-video-download {
          background: #ff7b20;
          color: #120c08;
        }

        .audio-to-video-primary:hover,
        .audio-to-video-download:hover {
          transform: translateY(-1px);
          background: #ff8a36;
        }

        .audio-to-video-secondary {
          border-color: rgba(255,255,255,.09);
          background: rgba(255,255,255,.025);
          color: rgba(255,255,255,.78);
        }

        .audio-to-video-secondary:hover {
          border-color: rgba(255,255,255,.18);
          background: rgba(255,255,255,.05);
        }

        .audio-to-video-primary:disabled,
        .audio-to-video-secondary:disabled {
          opacity: .45;
          cursor: not-allowed;
          transform: none;
        }

        .audio-to-video-actions {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        @media (max-width: 950px) {
          .audio-to-video-workspace {
            grid-template-columns: 1fr;
          }

          .audio-to-video-success {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .audio-to-video-tool {
            padding: 22px 18px 30px;
          }

          .audio-to-video-header {
            flex-direction: column;
          }

          .audio-to-video-format-grid,
          .audio-to-video-background-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .audio-to-video-actions {
            justify-content: stretch;
          }

          .audio-to-video-actions button {
            flex: 1 1 100%;
          }

          .audio-to-video-download {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}