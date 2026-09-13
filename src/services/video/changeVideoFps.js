import { FFmpeg } from "@ffmpeg/ffmpeg";
import {
  fetchFile,
  toBlobURL,
} from "@ffmpeg/util";

const CORE_VERSION = "0.12.10";

const CORE_BASE_URL =
  `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

let ffmpegInstance = null;
let ffmpegLoadPromise = null;

const FPS_OPTIONS = [
  {
    value: 23.976,
    label: "23.976",
  },
  {
    value: 24,
    label: "24",
  },
  {
    value: 25,
    label: "25",
  },
  {
    value: 29.97,
    label: "29.97",
  },
  {
    value: 30,
    label: "30",
  },
  {
    value: 50,
    label: "50",
  },
  {
    value: 59.94,
    label: "59.94",
  },
  {
    value: 60,
    label: "60",
  },
];

function getFFmpeg() {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  return ffmpegInstance;
}

async function loadFFmpeg() {
  const ffmpeg = getFFmpeg();

  if (ffmpeg.loaded) {
    return ffmpeg;
  }

  if (ffmpegLoadPromise) {
    return ffmpegLoadPromise;
  }

  ffmpegLoadPromise = (async () => {
    await ffmpeg.load({
      coreURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript"
      ),

      wasmURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (error) {
    ffmpegLoadPromise = null;
    throw error;
  }
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function getExtension(fileName) {
  const match =
    fileName.match(/\.([a-z0-9]+)$/i);

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function createInputName(file) {
  return `input.${getExtension(
    file.name
  )}`;
}

function createOutputName(fileName) {
  const dotIndex =
    fileName.lastIndexOf(".");

  const baseName =
    dotIndex > 0
      ? fileName.slice(0, dotIndex)
      : fileName;

  return `${baseName}-fps-${formatFpsForFileName(
    currentOutputFps
  )}.mp4`;
}

let currentOutputFps = 30;

function formatFpsForFileName(fps) {
  return String(fps)
    .replace(".", "_");
}

function formatBytes(bytes) {
  if (
    !Number.isFinite(bytes) ||
    bytes < 0
  ) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
}

function formatDuration(seconds) {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return "0:00";
  }

  const total =
    Math.round(seconds);

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) / 60
    );

  const remaining =
    total % 60;

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
}

function loadVideoMetadata(file) {
  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(file);

      const video =
        document.createElement(
          "video"
        );

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const cleanup = () => {
        URL.revokeObjectURL(url);

        video.removeAttribute(
          "src"
        );

        video.load();
      };

      video.onloadedmetadata =
        () => {
          const metadata = {
            width:
              video.videoWidth,

            height:
              video.videoHeight,

            duration:
              Number.isFinite(
                video.duration
              )
                ? video.duration
                : 0,
          };

          cleanup();
          resolve(metadata);
        };

      video.onerror = () => {
        cleanup();

        reject(
          new Error(
            "Unable to read the video metadata."
          )
        );
      };

      video.src = url;
    }
  );
}

function normalizeFps(value) {
  const numeric =
    Number(value);

  if (
    !Number.isFinite(numeric) ||
    numeric <= 0
  ) {
    throw new Error(
      "Please select a valid frame rate."
    );
  }

  const allowed =
    FPS_OPTIONS.some(
      (option) =>
        Math.abs(
          option.value -
            numeric
        ) < 0.001
    );

  if (!allowed) {
    throw new Error(
      "Unsupported frame rate."
    );
  }

  return numeric;
}

export async function getVideoFpsInfo(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid video file."
    );
  }

  if (
    !file.type.startsWith(
      "video/"
    )
  ) {
    throw new Error(
      "The selected file is not a supported video."
    );
  }

  const metadata =
    await loadVideoMetadata(
      file
    );

  /*
   * Browser video metadata does not expose
   * the source frame rate reliably.
   *
   * We therefore expose dimensions and
   * duration here and let FFmpeg perform
   * the actual conversion.
   */

  return {
    name: file.name,
    size: file.size,
    sizeLabel:
      formatBytes(file.size),

    width:
      metadata.width,

    height:
      metadata.height,

    duration:
      metadata.duration,

    durationLabel:
      formatDuration(
        metadata.duration
      ),
  };
}

export async function changeVideoFps(
  file,
  {
    fps,
    onProgress,
  } = {}
) {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid video file."
    );
  }

  if (
    !file.type.startsWith(
      "video/"
    )
  ) {
    throw new Error(
      "Please select a video file."
    );
  }

  const targetFps =
    normalizeFps(fps);

  currentOutputFps =
    targetFps;

  const metadata =
    await loadVideoMetadata(
      file
    );

  const ffmpeg =
    await loadFFmpeg();

  const inputName =
    createInputName(file);

  const outputName =
    createOutputName(file.name);

  const progressHandler =
    ({ progress }) => {
      const safeProgress =
        clamp(
          Number(progress) || 0,
          0,
          1
        );

      onProgress?.({
        phase:
          "converting",
        progress:
          safeProgress,
      });
    };

  ffmpeg.on(
    "progress",
    progressHandler
  );

  try {
    onProgress?.({
      phase: "loading",
      progress: 0,
    });

    await ffmpeg.writeFile(
      inputName,
      await fetchFile(file)
    );

    onProgress?.({
      phase:
        "converting",
      progress: 0.02,
    });

    await ffmpeg.exec([
      "-i",
      inputName,

      "-map",
      "0:v:0",

      "-map",
      "0:a?",

      "-r",
      String(targetFps),

      "-c:v",
      "libx264",

      "-preset",
      "veryfast",

      "-crf",
      "20",

      "-pix_fmt",
      "yuv420p",

      "-c:a",
      "aac",

      "-b:a",
      "160k",

      "-movflags",
      "+faststart",

      "-y",
      outputName,
    ]);

    onProgress?.({
      phase:
        "finalizing",
      progress: 0.98,
    });

    const outputData =
      await ffmpeg.readFile(
        outputName
      );

    const outputBytes =
      outputData instanceof
      Uint8Array
        ? outputData
        : new Uint8Array(
            outputData
          );

    const outputBlob =
      new Blob(
        [outputBytes.buffer],
        {
          type:
            "video/mp4",
        }
      );

    const outputFile =
      new File(
        [outputBlob],
        outputName,
        {
          type:
            "video/mp4",
        }
      );

    const savedBytes =
      Math.max(
        file.size -
          outputFile.size,
        0
      );

    const savedPercent =
      file.size > 0
        ? Math.max(
            0,
            (
              savedBytes /
              file.size
            ) *
              100
          )
        : 0;

    onProgress?.({
      phase:
        "complete",
      progress: 1,
    });

    return {
      file: outputFile,

      originalSize:
        file.size,

      outputSize:
        outputFile.size,

      originalSizeLabel:
        formatBytes(
          file.size
        ),

      outputSizeLabel:
        formatBytes(
          outputFile.size
        ),

      savedBytes,

      savedBytesLabel:
        formatBytes(
          savedBytes
        ),

      savedPercent,

      savedPercentLabel:
        `${savedPercent.toFixed(
          1
        )}%`,

      width:
        metadata.width,

      height:
        metadata.height,

      duration:
        metadata.duration,

      outputFps:
        targetFps,
    };
  } finally {
    ffmpeg.off(
      "progress",
      progressHandler
    );

    try {
      await ffmpeg.deleteFile(
        inputName
      );
    } catch {
      // Ignore cleanup errors.
    }

    try {
      await ffmpeg.deleteFile(
        outputName
      );
    } catch {
      // Ignore cleanup errors.
    }
  }
}

export { FPS_OPTIONS };