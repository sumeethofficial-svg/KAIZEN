import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createAudioRecorder,
  getSupportedAudioMimeType,
  createAudioDownloadUrl,
  revokeAudioDownloadUrl,
  formatRecordingTime,
  getRecordingFileName,
} from "../../services/audio/audioRecorder";

function AudioRecorder() {
  const [status, setStatus] = useState("idle");
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  const [recordingBlob, setRecordingBlob] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [recordingMimeType, setRecordingMimeType] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);

  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const accumulatedTimeRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const updateTimer = useCallback(() => {
    if (!startedAtRef.current) {
      return;
    }

    const currentSegment =
      (Date.now() - startedAtRef.current) / 1000;

    setElapsedTime(
      accumulatedTimeRef.current +
        currentSegment
    );
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();

    startedAtRef.current = Date.now();

    timerRef.current = window.setInterval(
      updateTimer,
      100
    );
  }, [stopTimer, updateTimer]);

  const pauseTimer = useCallback(() => {
    if (!startedAtRef.current) {
      return;
    }

    accumulatedTimeRef.current +=
      (Date.now() - startedAtRef.current) /
      1000;

    startedAtRef.current = 0;

    setElapsedTime(
      accumulatedTimeRef.current
    );

    stopTimer();
  }, [stopTimer]);

  const resumeTimer = useCallback(() => {
    startedAtRef.current = Date.now();

    timerRef.current = window.setInterval(
      updateTimer,
      100
    );
  }, [updateTimer]);

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(
        animationFrameRef.current
      );

      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current
        .close()
        .catch(() => {});

      audioContextRef.current = null;
    }

    analyserRef.current = null;

    setAudioLevel(0);
  }, []);

  const stopMicrophone = useCallback(() => {
    if (!mediaStreamRef.current) {
      return;
    }

    mediaStreamRef.current
      .getTracks()
      .forEach((track) => {
        track.stop();
      });

    mediaStreamRef.current = null;
  }, []);

  const startAudioMeter = useCallback(
    async (stream) => {
      try {
        const AudioContextClass =
          window.AudioContext ||
          window.webkitAudioContext;

        if (!AudioContextClass) {
          return;
        }

        const context =
          new AudioContextClass();

        if (context.state === "suspended") {
          await context.resume();
        }

        const source =
          context.createMediaStreamSource(
            stream
          );

        const analyser =
          context.createAnalyser();

        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.78;

        source.connect(analyser);

        audioContextRef.current =
          context;

        analyserRef.current = analyser;

        const data =
          new Uint8Array(
            analyser.frequencyBinCount
          );

        const updateMeter = () => {
          if (!analyserRef.current) {
            return;
          }

          analyser.getByteTimeDomainData(
            data
          );

          let sum = 0;

          for (
            let index = 0;
            index < data.length;
            index += 1
          ) {
            const normalized =
              (data[index] - 128) / 128;

            sum +=
              normalized *
              normalized;
          }

          const rms = Math.sqrt(
            sum / data.length
          );

          setAudioLevel(
            Math.min(100, rms * 260)
          );

          animationFrameRef.current =
            window.requestAnimationFrame(
              updateMeter
            );
        };

        updateMeter();
      } catch {
        setAudioLevel(0);
      }
    },
    []
  );

  const startRecording =
    useCallback(async () => {
      setErrorMessage("");

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices
          .getUserMedia
      ) {
        setErrorMessage(
          "Microphone recording is not supported by this browser."
        );

        setStatus("error");
        return;
      }

      if (
        typeof MediaRecorder ===
        "undefined"
      ) {
        setErrorMessage(
          "This browser does not support audio recording."
        );

        setStatus("error");
        return;
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            }
          );

        mediaStreamRef.current =
          stream;

        await startAudioMeter(stream);

        const mimeType =
          getSupportedAudioMimeType();

        const recorder =
          createAudioRecorder(
            stream,
            {
              mimeType,
              audioBitsPerSecond:
                128000,
            }
          );

        mediaRecorderRef.current =
          recorder;

        chunksRef.current = [];

        recorder.ondataavailable = (
          event
        ) => {
          if (
            event.data &&
            event.data.size > 0
          ) {
            chunksRef.current.push(
              event.data
            );
          }
        };

        recorder.onerror = () => {
          stopTimer();
          stopAudioMeter();
          stopMicrophone();

          setErrorMessage(
            "Something went wrong while recording."
          );

          setStatus("error");
        };

        recorder.onpause = () => {
          pauseTimer();
          setStatus("paused");
        };

        recorder.onresume = () => {
          resumeTimer();
          setStatus("recording");
        };

        recorder.onstop = () => {
          stopTimer();
          stopAudioMeter();
          stopMicrophone();

          const finalMimeType =
            recorder.mimeType ||
            mimeType ||
            "audio/webm";

          const blob = new Blob(
            chunksRef.current,
            {
              type: finalMimeType,
            }
          );

          if (!blob.size) {
            setErrorMessage(
              "No audio data was captured. Please try recording again."
            );

            setStatus("error");
            return;
          }

          const url =
            createAudioDownloadUrl(
              blob
            );

          setRecordingBlob(blob);
          setRecordingUrl(url);
          setRecordingMimeType(
            finalMimeType
          );

          setStatus("ready");

          mediaRecorderRef.current =
            null;
        };

        accumulatedTimeRef.current = 0;
        startedAtRef.current =
          Date.now();

        setElapsedTime(0);

        recorder.start(250);

        startTimer();

        setStatus("recording");
      } catch (error) {
        stopAudioMeter();
        stopMicrophone();

        if (
          error?.name ===
          "NotAllowedError"
        ) {
          setErrorMessage(
            "Microphone permission was denied. Please allow microphone access and try again."
          );
        } else if (
          error?.name ===
          "NotFoundError"
        ) {
          setErrorMessage(
            "No microphone was found on this device."
          );
        } else {
          setErrorMessage(
            "Unable to access your microphone. Please check your browser permissions."
          );
        }

        setStatus("error");
      }
    }, [
      pauseTimer,
      resumeTimer,
      startAudioMeter,
      startTimer,
      stopAudioMeter,
      stopMicrophone,
      stopTimer,
    ]);

  const pauseRecording =
    useCallback(() => {
      const recorder =
        mediaRecorderRef.current;

      if (
        !recorder ||
        recorder.state !==
          "recording"
      ) {
        return;
      }

      recorder.pause();
    }, []);

  const resumeRecording =
    useCallback(() => {
      const recorder =
        mediaRecorderRef.current;

      if (
        !recorder ||
        recorder.state !==
          "paused"
      ) {
        return;
      }

      recorder.resume();
    }, []);

  const stopRecording =
    useCallback(() => {
      const recorder =
        mediaRecorderRef.current;

      if (!recorder) {
        return;
      }

      if (
        recorder.state !==
        "inactive"
      ) {
        recorder.stop();
      }
    }, []);

  const resetRecorder =
    useCallback(() => {
      stopTimer();
      stopAudioMeter();
      stopMicrophone();

      if (recordingUrl) {
        revokeAudioDownloadUrl(
          recordingUrl
        );
      }

      mediaRecorderRef.current =
        null;

      chunksRef.current = [];

      startedAtRef.current = 0;
      accumulatedTimeRef.current = 0;

      setElapsedTime(0);
      setAudioLevel(0);

      setRecordingBlob(null);
      setRecordingUrl("");
      setRecordingMimeType("");

      setErrorMessage("");
      setStatus("idle");
    }, [
      recordingUrl,
      stopAudioMeter,
      stopMicrophone,
      stopTimer,
    ]);

  const downloadRecording =
    useCallback(() => {
      if (
        !recordingBlob ||
        !recordingUrl
      ) {
        return;
      }

      const fileName =
        getRecordingFileName(
          recordingMimeType
        );

      const anchor =
        document.createElement(
          "a"
        );

      anchor.href = recordingUrl;
      anchor.download = fileName;
      anchor.rel = "noopener";

      document.body.appendChild(
        anchor
      );

      anchor.click();

      anchor.remove();
    }, [
      recordingBlob,
      recordingMimeType,
      recordingUrl,
    ]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopAudioMeter();
      stopMicrophone();

      if (recordingUrl) {
        revokeAudioDownloadUrl(
          recordingUrl
        );
      }
    };
  }, [
    recordingUrl,
    stopAudioMeter,
    stopMicrophone,
    stopTimer,
  ]);

  const isRecording =
    status === "recording";

  const isPaused =
    status === "paused";

  const hasResult =
    status === "ready";

  const buttonBase = {
    minHeight: "46px",
    borderRadius: "13px",
    padding: "0 18px",
    border:
      "1px solid rgba(255,255,255,.09)",
    font: "inherit",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    transition:
      "transform .15s ease, background .15s ease, border-color .15s ease",
  };

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: "26px 30px 38px",
        color:
          "rgba(255,255,255,.94)",
      }}
    >
      <div
        style={{
          marginBottom: "22px",
        }}
      >
        <div
          style={{
            marginBottom: "7px",
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: ".18em",
            color:
              "rgba(255,153,82,.75)",
          }}
        >
          MICROPHONE
        </div>

        <h2
          style={{
            margin: 0,
            fontSize:
              "clamp(26px, 3vw, 36px)",
            lineHeight: 1.05,
            letterSpacing: "-.04em",
          }}
        >
          Audio Recorder
        </h2>

        <p
          style={{
            maxWidth: "640px",
            margin: "10px 0 0",
            color:
              "rgba(255,255,255,.55)",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          Record clear audio directly
          from your microphone.
          Everything happens inside
          your browser.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          overflow: "hidden",
          border:
            "1px solid rgba(255,255,255,.08)",
          borderRadius: "24px",
          padding: "34px 30px 30px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,111,0,.13), transparent 42%), rgba(255,255,255,.035)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,.035), 0 22px 60px rgba(0,0,0,.22)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: "9px",
            color:
              "rgba(255,255,255,.52)",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: ".12em",
            textTransform:
              "uppercase",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background:
                isRecording
                  ? "#ff6a00"
                  : "rgba(255,255,255,.26)",
              boxShadow:
                isRecording
                  ? "0 0 0 4px rgba(255,106,0,.1), 0 0 18px rgba(255,106,0,.45)"
                  : "0 0 0 4px rgba(255,255,255,.025)",
            }}
          />

          <span>
            {isRecording
              ? "Recording"
              : isPaused
                ? "Paused"
                : hasResult
                  ? "Recording ready"
                  : status === "error"
                    ? "Recording error"
                    : "Ready to record"}
          </span>
        </div>

        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontVariantNumeric:
              "tabular-nums",
            fontSize:
              "clamp(44px, 8vw, 72px)",
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: "-.06em",
            color: "#fff",
          }}
        >
          {formatRecordingTime(
            elapsedTime
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            gap: "4px",
            minHeight: "68px",
            margin:
              "24px auto 10px",
            maxWidth: "680px",
          }}
        >
          {Array.from({
            length: 36,
          }).map((_, index) => {
            const threshold =
              3 +
              (index / 35) * 70;

            const active =
              audioLevel >=
                threshold ||
              (isRecording &&
                index <
                  Math.max(
                    2,
                    audioLevel / 3
                  ));

            const height = active
              ? 18 +
                Math.round(
                  audioLevel *
                    0.48
                )
              : 10 +
                ((index * 7) % 18);

            return (
              <span
                key={index}
                style={{
                  width: "5px",
                  height: `${Math.min(
                    height,
                    58
                  )}px`,
                  borderRadius:
                    "999px",
                  background: active
                    ? "rgba(255,106,0,.82)"
                    : "rgba(255,255,255,.08)",
                  boxShadow: active
                    ? "0 0 14px rgba(255,106,0,.18)"
                    : "none",
                  transition:
                    "height .09s ease, background .12s ease",
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "center",
            flexWrap: "wrap",
            gap: "10px",
            marginTop: "24px",
          }}
        >
          {(status === "idle" ||
            status === "error") && (
            <button
              type="button"
              onClick={startRecording}
              style={{
                ...buttonBase,
                color: "#fff",
                borderColor:
                  "transparent",
                background:
                  "linear-gradient(135deg, #ff7600, #ff4d00)",
                boxShadow:
                  "0 10px 28px rgba(255,91,0,.2)",
              }}
            >
              ● Start Recording
            </button>
          )}

          {isRecording && (
            <>
              <button
                type="button"
                onClick={
                  pauseRecording
                }
                style={{
                  ...buttonBase,
                  color:
                    "rgba(255,255,255,.82)",
                  background:
                    "rgba(255,255,255,.045)",
                }}
              >
                ⏸ Pause
              </button>

              <button
                type="button"
                onClick={
                  stopRecording
                }
                style={{
                  ...buttonBase,
                  color:
                    "rgba(255,255,255,.9)",
                  background:
                    "rgba(155,49,38,.22)",
                  borderColor:
                    "rgba(255,100,80,.18)",
                }}
              >
                ■ Stop
              </button>
            </>
          )}

          {isPaused && (
            <>
              <button
                type="button"
                onClick={
                  resumeRecording
                }
                style={{
                  ...buttonBase,
                  color: "#fff",
                  borderColor:
                    "transparent",
                  background:
                    "linear-gradient(135deg, #ff7600, #ff4d00)",
                }}
              >
                ▶ Resume
              </button>

              <button
                type="button"
                onClick={
                  stopRecording
                }
                style={{
                  ...buttonBase,
                  color:
                    "rgba(255,255,255,.9)",
                  background:
                    "rgba(155,49,38,.22)",
                  borderColor:
                    "rgba(255,100,80,.18)",
                }}
              >
                ■ Stop
              </button>
            </>
          )}

          {hasResult && (
            <>
              <button
                type="button"
                onClick={
                  downloadRecording
                }
                style={{
                  ...buttonBase,
                  color: "#fff",
                  borderColor:
                    "transparent",
                  background:
                    "linear-gradient(135deg, #ff7600, #ff4d00)",
                  boxShadow:
                    "0 10px 28px rgba(255,91,0,.2)",
                }}
              >
                ↓ Download Recording
              </button>

              <button
                type="button"
                onClick={
                  resetRecorder
                }
                style={{
                  ...buttonBase,
                  color:
                    "rgba(255,255,255,.82)",
                  background:
                    "rgba(255,255,255,.045)",
                }}
              >
                ↺ Record Again
              </button>
            </>
          )}
        </div>

        {errorMessage && (
          <div
            style={{
              maxWidth: "680px",
              margin:
                "18px auto 0",
              border:
                "1px solid rgba(255,91,76,.18)",
              borderRadius: "12px",
              padding:
                "12px 14px",
              background:
                "rgba(255,91,76,.06)",
              color:
                "rgba(255,185,175,.94)",
              fontSize: "12px",
              lineHeight: 1.5,
              textAlign: "center",
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>

      {hasResult &&
        recordingUrl && (
          <div
            style={{
              marginTop: "18px",
              border:
                "1px solid rgba(255,255,255,.08)",
              borderRadius: "20px",
              padding: "22px",
              background:
                "rgba(255,255,255,.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "space-between",
                gap: "18px",
                marginBottom:
                  "16px",
              }}
            >
              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "5px",
                }}
              >
                <span
                  style={{
                    fontSize:
                      "9px",
                    fontWeight: 700,
                    letterSpacing:
                      ".16em",
                    color:
                      "rgba(255,153,82,.72)",
                  }}
                >
                  RECORDING COMPLETE
                </span>

                <strong
                  style={{
                    fontSize:
                      "16px",
                    color:
                      "rgba(255,255,255,.92)",
                  }}
                >
                  Your audio is
                  ready.
                </strong>
              </div>

              <span
                style={{
                  color:
                    "rgba(255,255,255,.42)",
                  fontSize:
                    "11px",
                }}
              >
                {recordingBlob
                  ? `${(
                      recordingBlob.size /
                      1024 /
                      1024
                    ).toFixed(
                      2
                    )} MB`
                  : ""}
              </span>
            </div>

            <audio
              controls
              src={recordingUrl}
              style={{
                display: "block",
                width: "100%",
                height: "44px",
              }}
            >
              Your browser does
              not support audio
              playback.
            </audio>
          </div>
        )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(2, minmax(0, 1fr))",
          gap: "12px",
          marginTop: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            border:
              "1px solid rgba(255,255,255,.06)",
            borderRadius: "14px",
            padding:
              "15px 16px",
            background:
              "rgba(255,255,255,.022)",
          }}
        >
          <strong
            style={{
              fontSize: "11px",
              color:
                "rgba(255,255,255,.82)",
            }}
          >
            Private by design
          </strong>

          <span
            style={{
              fontSize: "11px",
              lineHeight: 1.5,
              color:
                "rgba(255,255,255,.4)",
            }}
          >
            Your recording stays
            in your browser until
            you download it.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            border:
              "1px solid rgba(255,255,255,.06)",
            borderRadius: "14px",
            padding:
              "15px 16px",
            background:
              "rgba(255,255,255,.022)",
          }}
        >
          <strong
            style={{
              fontSize: "11px",
              color:
                "rgba(255,255,255,.82)",
            }}
          >
            Browser recording
          </strong>

          <span
            style={{
              fontSize: "11px",
              lineHeight: 1.5,
              color:
                "rgba(255,255,255,.4)",
            }}
          >
            Uses your device
            microphone and browser
            audio APIs.
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 700px) {
          .kaizen-recorder-info {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default AudioRecorder;