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

const OUTPUT_FORMATS = {
  mp4: {
    label: "MP4",
    extension: "mp4",
    mimeType: "video/mp4",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "160k",
    pixelFormat: "yuv420p",
    extraArgs: [
      "-movflags",
      "+faststart",
    ],
  },

  webm: {
    label: "WebM",
    extension: "webm",
    mimeType: "video/webm",
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    audioBitrate: "128k",
    pixelFormat: null,
    extraArgs: [],
  },

  mov: {
    label: "MOV",
    extension: "mov",
    mimeType: "video/quicktime",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "160k",
    pixelFormat: "yuv420p",
    extraArgs: [],
  },

  mkv: {
    label: "MKV",
    extension: "mkv",
    mimeType: "video/x-matroska",
    videoCodec: "libx264",
    audioCodec: "aac",
    audioBitrate: "160k",
    pixelFormat: "yuv420p",
    extraArgs: [],
  },

  avi: {
    label: "AVI",
    extension: "avi",
    mimeType: "video/x-msvideo",
    videoCodec: "mpeg4",
    audioCodec: "mp3",
    audioBitrate: "128k",
    pixelFormat: "yuv420p",
    extraArgs: [],
  },
};

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

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function getInputExtension(fileName) {
  const match =
    fileName.match(
      /\.([a-z0-9]+)$/i
    );

  return match
    ? match[1].toLowerCase()
    : "mp4";
}

function createInputName(file) {
  return `input.${getInputExtension(
    file.name
  )}`;
}

function createOutputName(
  fileName,
  format
) {
  const dotIndex =
    fileName.lastIndexOf(".");

  const baseName =
    dotIndex > 0
      ? fileName.slice(0, dotIndex)
      : fileName;

  return `${baseName}-converted.${format.extension}`;
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

function formatDuration(
  seconds
) {
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

export async function getVideoConversionInfo(
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
    extension:
      getInputExtension(
        file.name
      ),
  };
}

export async function convertVideo(
  file,
  {
    format = "mp4",
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

  const targetFormat =
    OUTPUT_FORMATS[format];

  if (!targetFormat) {
    throw new Error(
      "Unsupported output format."
    );
  }

  const metadata =
    await loadVideoMetadata(
      file
    );

  const ffmpeg =
    await loadFFmpeg();

  const inputName =
    createInputName(file);

  const outputName =
    createOutputName(
      file.name,
      targetFormat
    );

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

    const command = [
      "-i",
      inputName,

      "-map",
      "0:v:0",

      "-map",
      "0:a?",

      "-c:v",
      targetFormat.videoCodec,

      "-preset",
      "veryfast",

      ...(targetFormat.pixelFormat
        ? [
            "-pix_fmt",
            targetFormat.pixelFormat,
          ]
        : []),

      "-c:a",
      targetFormat.audioCodec,

      "-b:a",
      targetFormat.audioBitrate,

      ...targetFormat.extraArgs,

      "-y",
      outputName,
    ];

    await ffmpeg.exec(
      command
    );

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
            targetFormat.mimeType,
        }
      );

    const outputFile =
      new File(
        [outputBlob],
        createOutputName(
          file.name,
          targetFormat
        ),
        {
          type:
            targetFormat.mimeType,
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

      format,

      formatLabel:
        targetFormat.label,

      originalSize:
        file.size,

      outputSize:
        outputFile.size,

      originalSizeLabel:
        formatBytes(file.size),

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

      durationLabel:
        formatDuration(
          metadata.duration
        ),
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

export {
  OUTPUT_FORMATS,
};