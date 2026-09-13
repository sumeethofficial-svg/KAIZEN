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

const CONTAINERS = {
  mp4: {
    extension: "mp4",
    mimeType: "video/mp4",
    args: ["-movflags", "+faststart"],
  },
  webm: {
    extension: "webm",
    mimeType: "video/webm",
    args: [],
  },
  mov: {
    extension: "mov",
    mimeType: "video/quicktime",
    args: ["-movflags", "+faststart"],
  },
  mkv: {
    extension: "mkv",
    mimeType: "video/x-matroska",
    args: [],
  },
};

const getContainerFromFile = (file) => {
  const extension =
    file.name.split(".").pop()?.toLowerCase();

  if (extension && CONTAINERS[extension]) {
    return extension;
  }

  if (file.type === "video/webm") {
    return "webm";
  }

  if (file.type === "video/quicktime") {
    return "mov";
  }

  return "mp4";
};

const sanitizeBaseName = (name) => {
  const withoutExtension =
    name.replace(/\.[^/.]+$/, "");

  const cleaned = withoutExtension
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return cleaned || "kaizen-muted-video";
};

export const muteVideo = async ({
  file,
  container = "auto",
  onProgress,
  signal,
}) => {
  if (!(file instanceof File)) {
    throw new Error("Please provide a valid video file.");
  }

  if (file.size <= 0) {
    throw new Error("The selected video file is empty.");
  }

  const selectedContainer =
    container === "auto"
      ? getContainerFromFile(file)
      : container;

  const outputConfig =
    CONTAINERS[selectedContainer];

  if (!outputConfig) {
    throw new Error(
      "Unsupported output container."
    );
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
    file.name
      .split(".")
      .pop()
      ?.toLowerCase() || "mp4";

  const inputName = `input.${inputExtension}`;
  const outputName = `output.${outputConfig.extension}`;

  const inputData = await fetchFile(file);

  await ffmpeg.writeFile(
    inputName,
    inputData
  );

  let progressHandler;

  try {
    progressHandler = ({ progress }) => {
      if (typeof onProgress !== "function") {
        return;
      }

      const percent = Math.max(
        0,
        Math.min(
          100,
          Math.round(progress * 100)
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
      "-map",
      "0:v:0",
      "-an",
      "-c:v",
      "copy",
    ];

    args.push(
      ...outputConfig.args,
      "-y",
      outputName
    );

    const exitCode = await ffmpeg.exec(
      args
    );

    if (signal?.aborted) {
      throw new DOMException(
        "Operation cancelled.",
        "AbortError"
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        "Could not mute this video. The selected container may not support the source video stream."
      );
    }

    const outputData =
      await ffmpeg.readFile(outputName);

    const outputBytes =
      outputData instanceof Uint8Array
        ? outputData
        : new Uint8Array(outputData);

    const blob = new Blob(
      [outputBytes],
      {
        type: outputConfig.mimeType,
      }
    );

    const url =
      URL.createObjectURL(blob);

    if (typeof onProgress === "function") {
      onProgress(100);
    }

    return {
      blob,
      url,
      fileName: `${sanitizeBaseName(
        file.name
      )}.${outputConfig.extension}`,
      size: blob.size,
      mimeType: outputConfig.mimeType,
      format: outputConfig.extension,
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