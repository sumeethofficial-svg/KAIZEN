import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  fetchFile,
  toBlobURL,
} from "@ffmpeg/util";

let ffmpegInstance = null;
let ffmpegLoaded = false;
let loadPromise = null;

const CORE_VERSION = "0.12.10";

const CORE_BASE_URL =
  `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

async function getFFmpeg(
  onProgress
) {
  if (
    ffmpegInstance &&
    ffmpegLoaded
  ) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    ffmpeg.on(
      "progress",
      ({ progress }) => {
        onProgress?.({
          stage: "processing",
          progress:
            Math.round(
              Math.max(
                0,
                Math.min(
                  1,
                  progress
                )
              ) * 100
            ),
        });
      }
    );

    ffmpeg.on(
      "log",
      ({ message }) => {
        console.debug(
          "[KAIZEN FFmpeg]",
          message
        );
      }
    );

    onProgress?.({
      stage: "loading",
      progress: 5,
      message:
        "Loading video engine...",
    });

    const coreURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript"
      );

    const wasmURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      );

    const workerURL =
      await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.worker.js`,
        "text/javascript"
      );

    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    });

    ffmpegInstance = ffmpeg;
    ffmpegLoaded = true;

    onProgress?.({
      stage: "ready",
      progress: 12,
      message:
        "Video engine ready.",
    });

    return ffmpeg;
  })();

  try {
    return await loadPromise;
  } catch (error) {
    loadPromise = null;
    ffmpegInstance = null;
    ffmpegLoaded = false;
    throw error;
  }
}

function getExtension(
  fileName
) {
  const match =
    fileName.match(
      /\.([^.]+)$/
    );

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function formatTime(
  seconds
) {
  const safeSeconds =
    Math.max(
      0,
      Number(seconds) || 0
    );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  const remaining =
    safeSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(
        2,
        "0"
      ),
      String(minutes).padStart(
        2,
        "0"
      ),
      String(
        Math.floor(
          remaining
        )
      ).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(
      2,
      "0"
    ),
    String(
      Math.floor(
        remaining
      )
    ).padStart(2, "0"),
    ].join(":");
}

export function formatVideoTime(
  seconds
) {
  return formatTime(
    seconds
  );
}

export async function getVideoInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select a valid video file."
    );
  }

  const videoURL =
    URL.createObjectURL(file);

  try {
    const info =
      await new Promise(
        (resolve, reject) => {
          const video =
            document.createElement(
              "video"
            );

          video.preload =
            "metadata";

          video.muted = true;

          video.onloadedmetadata =
            () => {
              resolve({
                duration:
                  Number.isFinite(
                    video.duration
                  )
                    ? video.duration
                    : 0,

                width:
                  video.videoWidth,

                height:
                  video.videoHeight,

                aspectRatio:
                  video.videoHeight
                    ? video.videoWidth /
                      video.videoHeight
                    : 0,
              });
            };

          video.onerror = () => {
            reject(
              new Error(
                "Unable to read this video file."
              )
            );
          };

          video.src =
            videoURL;
        }
      );

    return {
      fileName: file.name,
      fileSize: file.size,
      mimeType:
        file.type ||
        "video/mp4",
      extension:
        getExtension(
          file.name
        ),
      ...info,
    };
  } finally {
    URL.revokeObjectURL(
      videoURL
    );
  }
}

export async function trimVideo(
  file,
  {
    startTime = 0,
    endTime,
    outputFormat = "mp4",
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please select a valid video file."
    );
  }

  const durationInfo =
    await getVideoInfo(
      file
    );

  const duration =
    durationInfo.duration;

  const start =
    Math.max(
      0,
      Math.min(
        Number(startTime) || 0,
        duration
      )
    );

  const end =
    Math.max(
      start,
      Math.min(
        Number.isFinite(
          Number(endTime)
        )
          ? Number(endTime)
          : duration,
        duration
      )
    );

  if (
    end <= start
  ) {
    throw new Error(
      "The end time must be greater than the start time."
    );
  }

  const clipDuration =
    end - start;

  if (clipDuration < 0.05) {
    throw new Error(
      "The selected clip is too short."
    );
  }

  const ffmpeg =
    await getFFmpeg(
      onProgress
    );

  const inputExtension =
    getExtension(
      file.name
    );

  const inputName =
    `kaizen-input.${inputExtension}`;

  const outputExtension =
    outputFormat === "webm"
      ? "webm"
      : "mp4";

  const outputName =
    `kaizen-trimmed-${Date.now()}.${outputExtension}`;

  onProgress?.({
    stage: "reading",
    progress: 15,
    message:
      "Preparing video...",
  });

  await ffmpeg.writeFile(
    inputName,
    await fetchFile(file)
  );

  onProgress?.({
    stage: "processing",
    progress: 20,
    message:
      "Trimming video...",
  });

  /*
   * Fast trim first.
   *
   * -ss before -i allows FFmpeg to seek
   * quickly to the selected region.
   *
   * We re-encode the output so the result
   * is reliable across different source
   * formats and exact end boundaries.
   */

  if (
    outputExtension ===
    "webm"
  ) {
    await ffmpeg.exec([
      "-ss",
      formatTime(start),
      "-i",
      inputName,
      "-t",
      formatTime(
        clipDuration
      ),
      "-c:v",
      "libvpx",
      "-c:a",
      "libvorbis",
      "-deadline",
      "good",
      outputName,
    ]);
  } else {
    await ffmpeg.exec([
      "-ss",
      formatTime(start),
      "-i",
      inputName,
      "-t",
      formatTime(
        clipDuration
      ),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputName,
    ]);
  }

  onProgress?.({
    stage: "reading-output",
    progress: 94,
    message:
      "Preparing trimmed video...",
  });

  const output =
    await ffmpeg.readFile(
      outputName
    );

  const outputType =
    outputExtension === "webm"
      ? "video/webm"
      : "video/mp4";

  const blob =
    new Blob(
      [output.buffer],
      {
        type:
          outputType,
      }
    );

  try {
    await ffmpeg.deleteFile(
      inputName
    );
  } catch {
    // Ignore cleanup failure.
  }

  try {
    await ffmpeg.deleteFile(
      outputName
    );
  } catch {
    // Ignore cleanup failure.
  }

  onProgress?.({
    stage: "complete",
    progress: 100,
    message:
      "Video ready.",
  });

  const baseName =
    file.name.replace(
      /\.[^/.]+$/,
      ""
    );

  return {
    blob,
    fileName:
      `${baseName}-trimmed.${outputExtension}`,
    byteSize:
      blob.size,
    duration:
      clipDuration,
    startTime: start,
    endTime: end,
    outputFormat:
      outputExtension,
  };
}