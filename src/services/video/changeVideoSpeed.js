import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

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

const OUTPUTS = {
  mp4: {
    extension: "mp4",
    mimeType: "video/mp4",
    videoCodec: "libx264",
    audioCodec: "aac",
    args: [
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
    ],
  },

  webm: {
    extension: "webm",
    mimeType: "video/webm",
    videoCodec: "libvpx-vp9",
    audioCodec: "libopus",
    args: [
      "-crf",
      "32",
      "-b:v",
      "0",
      "-b:a",
      "128k",
    ],
  },

  mov: {
    extension: "mov",
    mimeType: "video/quicktime",
    videoCodec: "libx264",
    audioCodec: "aac",
    args: [
      "-preset",
      "veryfast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-b:a",
      "192k",
      "-movflags",
      "+faststart",
    ],
  },
};

const sanitizeBaseName = (name) => {
  const withoutExtension = name.replace(/\.[^/.]+$/, "");

  const cleaned = withoutExtension
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "kaizen-speed-video";
};

const buildAtempoFilter = (speed) => {
  let remaining = speed;
  const parts = [];

  if (remaining > 2) {
    while (remaining > 2) {
      parts.push("atempo=2");
      remaining /= 2;
    }

    parts.push(`atempo=${remaining}`);
  } else if (remaining < 0.5) {
    while (remaining < 0.5) {
      parts.push("atempo=0.5");
      remaining /= 0.5;
    }

    parts.push(`atempo=${remaining}`);
  } else {
    parts.push(`atempo=${remaining}`);
  }

  return parts.join(",");
};

export const changeVideoSpeed = async ({
  file,
  speed = 1,
  format = "mp4",
  onProgress,
  signal,
}) => {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid video file.");
  }

  if (file.size <= 0) {
    throw new Error("The selected video file is empty.");
  }

  const selectedSpeed = Number(speed);

  if (
    !Number.isFinite(selectedSpeed) ||
    selectedSpeed < 0.25 ||
    selectedSpeed > 4
  ) {
    throw new Error(
      "Video speed must be between 0.25× and 4×."
    );
  }

  const outputConfig = OUTPUTS[format];

  if (!outputConfig) {
    throw new Error("Unsupported output format.");
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Operation cancelled.",
      "AbortError"
    );
  }

  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) {
    throw new DOMException(
      "Operation cancelled.",
      "AbortError"
    );
  }

  const inputExtension =
    file.name.split(".").pop()?.toLowerCase() || "mp4";

  const inputName = `input.${inputExtension}`;
  const outputName = `output.${outputConfig.extension}`;

  const inputData = await fetchFile(file);

  await ffmpeg.writeFile(inputName, inputData);

  let progressHandler;

  try {
    progressHandler = ({ progress }) => {
      if (typeof onProgress !== "function") {
        return;
      }

      const percent = Math.max(
        0,
        Math.min(100, Math.round(progress * 100))
      );

      onProgress(percent);
    };

    ffmpeg.on("progress", progressHandler);

    const args = [
      "-i",
      inputName,
      "-map",
      "0:v:0",
      "-map",
      "0:a:0?",
      "-filter:v",
      `setpts=PTS/${selectedSpeed}`,
      "-c:v",
      outputConfig.videoCodec,
    ];

    const hasAudioFilter = buildAtempoFilter(selectedSpeed);

    args.push(
      "-filter:a",
      hasAudioFilter,
      "-c:a",
      outputConfig.audioCodec,
      ...outputConfig.args,
      "-y",
      outputName
    );

    const exitCode = await ffmpeg.exec(args);

    if (signal?.aborted) {
      throw new DOMException(
        "Operation cancelled.",
        "AbortError"
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        "Video speed conversion failed."
      );
    }

    const outputData =
      await ffmpeg.readFile(outputName);

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(outputData);

    const blob = new Blob([outputBytes], {
      type: outputConfig.mimeType,
    });

    const url = URL.createObjectURL(blob);

    if (typeof onProgress === "function") {
      onProgress(100);
    }

    return {
      blob,
      url,
      fileName: `${sanitizeBaseName(
        file.name
      )}-${String(selectedSpeed).replace(".", "-")}x.${
        outputConfig.extension
      }`,
      size: blob.size,
      mimeType: outputConfig.mimeType,
      format: outputConfig.extension,
      speed: selectedSpeed,
    };
  } finally {
    if (progressHandler) {
      ffmpeg.off("progress", progressHandler);
    }

    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore cleanup failure.
    }

    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore cleanup failure.
    }
  }
};