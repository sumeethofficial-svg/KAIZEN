import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

const OUTPUTS = {
  mp3: {
    extension: "mp3",
    mimeType: "audio/mpeg",
    codec: "libmp3lame",
  },

  m4a: {
    extension: "m4a",
    mimeType: "audio/mp4",
    codec: "aac",
  },

  ogg: {
    extension: "ogg",
    mimeType: "audio/ogg",
    codec: "libvorbis",
  },

  opus: {
    extension: "opus",
    mimeType: "audio/ogg; codecs=opus",
    codec: "libopus",
  },
};

const getFFmpeg = async () => {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }

  if (ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (!ffmpegLoadingPromise) {
    ffmpegLoadingPromise = (async () => {
      await ffmpegInstance.load({
        coreURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.js`,
          "text/javascript"
        ),
        wasmURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.wasm`,
          "application/wasm"
        ),
        workerURL: await toBlobURL(
          `${CORE_BASE_URL}/ffmpeg-core.worker.js`,
          "text/javascript"
        ),
      });
    })().finally(() => {
      ffmpegLoadingPromise = null;
    });
  }

  await ffmpegLoadingPromise;

  return ffmpegInstance;
};

const sanitizeBaseName = (name) => {
  const withoutExtension = name.replace(
    /\.[^/.]+$/,
    ""
  );

  const cleaned = withoutExtension
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "kaizen-compressed-audio";
};

const getInputExtension = (file) => {
  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  return extension || "audio";
};

export const compressAudio = async ({
  file,
  format = "mp3",
  bitrate = "128k",
  onProgress,
  signal,
}) => {
  if (!(file instanceof File)) {
    throw new Error(
      "Please provide a valid audio file."
    );
  }

  if (file.size <= 0) {
    throw new Error(
      "The selected audio file is empty."
    );
  }

  const outputConfig = OUTPUTS[format];

  if (!outputConfig) {
    throw new Error(
      "Unsupported output format."
    );
  }

  const allowedBitrates = [
    "64k",
    "96k",
    "128k",
    "160k",
    "192k",
    "256k",
    "320k",
  ];

  if (!allowedBitrates.includes(bitrate)) {
    throw new Error(
      "Unsupported bitrate."
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Compression cancelled.",
      "AbortError"
    );
  }

  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) {
    throw new DOMException(
      "Compression cancelled.",
      "AbortError"
    );
  }

  const inputName =
    `input.${getInputExtension(file)}`;

  const outputName =
    `output.${outputConfig.extension}`;

  const inputData = await fetchFile(file);

  await ffmpeg.writeFile(
    inputName,
    inputData
  );

  let progressHandler;

  try {
    progressHandler = ({ progress }) => {
      if (
        typeof onProgress !==
        "function"
      ) {
        return;
      }

      const percent = Math.max(
        0,
        Math.min(
          100,
          Math.round(
            progress * 100
          )
        )
      );

      onProgress(percent);
    };

    ffmpeg.on(
      "progress",
      progressHandler
    );

    const args = [
      "-i",
      inputName,
      "-vn",
      "-c:a",
      outputConfig.codec,
      "-b:a",
      bitrate,
    ];

    if (format === "ogg") {
      args.push(
        "-q:a",
        bitrate === "64k"
          ? "2"
          : bitrate === "96k"
          ? "3"
          : bitrate === "128k"
          ? "4"
          : bitrate === "160k"
          ? "5"
          : bitrate === "192k"
          ? "6"
          : "7"
      );
    }

    if (format === "opus") {
      args.push(
        "-vbr",
        "on"
      );
    }

    args.push(
      "-y",
      outputName
    );

    const exitCode =
      await ffmpeg.exec(args);

    if (signal?.aborted) {
      throw new DOMException(
        "Compression cancelled.",
        "AbortError"
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        "Audio compression failed."
      );
    }

    const outputData =
      await ffmpeg.readFile(
        outputName
      );

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(
            outputData
          );

    const blob = new Blob(
      [outputBytes],
      {
        type:
          outputConfig.mimeType,
      }
    );

    const url =
      URL.createObjectURL(blob);

    const inputSize = file.size;
    const outputSize = blob.size;

    const savedBytes =
      Math.max(
        0,
        inputSize - outputSize
      );

    const savedPercent =
      inputSize > 0
        ? Math.max(
            0,
            Math.round(
              (savedBytes /
                inputSize) *
                100
            )
          )
        : 0;

    if (
      typeof onProgress ===
      "function"
    ) {
      onProgress(100);
    }

    return {
      blob,
      url,
      fileName: `${sanitizeBaseName(
        file.name
      )}-compressed.${outputConfig.extension}`,
      size: outputSize,
      originalSize: inputSize,
      savedBytes,
      savedPercent,
      mimeType:
        outputConfig.mimeType,
      format:
        outputConfig.extension,
      bitrate,
    };
  } finally {
    if (progressHandler) {
      ffmpeg.off(
        "progress",
        progressHandler
      );
    }

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
  }
};