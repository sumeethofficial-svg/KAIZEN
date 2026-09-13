import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE_URL =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpegInstance = null;
let ffmpegLoadingPromise = null;

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

  return cleaned || "kaizen-audio-video";
};

const getExtension = (file, fallback) => {
  return (
    file?.name
      ?.split(".")
      .pop()
      ?.toLowerCase() || fallback
  );
};

export const audioToVideo = async ({
  audioFile,
  imageFile = null,
  format = "mp4",
  background = "dark",
  onProgress,
  signal,
}) => {
  if (!(audioFile instanceof File)) {
    throw new Error(
      "Please provide a valid audio file."
    );
  }

  if (audioFile.size <= 0) {
    throw new Error(
      "The selected audio file is empty."
    );
  }

  if (
    imageFile !== null &&
    !(imageFile instanceof File)
  ) {
    throw new Error(
      "The selected image file is invalid."
    );
  }

  if (
    imageFile &&
    imageFile.size <= 0
  ) {
    throw new Error(
      "The selected image file is empty."
    );
  }

  const outputConfig =
    OUTPUTS[format];

  if (!outputConfig) {
    throw new Error(
      "Unsupported output format."
    );
  }

  if (signal?.aborted) {
    throw new DOMException(
      "Conversion cancelled.",
      "AbortError"
    );
  }

  const ffmpeg = await getFFmpeg();

  if (signal?.aborted) {
    throw new DOMException(
      "Conversion cancelled.",
      "AbortError"
    );
  }

  const audioName = `audio.${getExtension(
    audioFile,
    "audio"
  )}`;

  const imageName = imageFile
    ? `cover.${getExtension(
        imageFile,
        "jpg"
      )}`
    : null;

  const outputName =
    `output.${outputConfig.extension}`;

  const audioData =
    await fetchFile(audioFile);

  await ffmpeg.writeFile(
    audioName,
    audioData
  );

  if (imageFile) {
    const imageData =
      await fetchFile(imageFile);

    await ffmpeg.writeFile(
      imageName,
      imageData
    );
  }

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

    const args = [];

    if (imageFile) {
      args.push(
        "-loop",
        "1",
        "-i",
        imageName,
        "-i",
        audioName
      );
    } else {
      const backgroundColor =
        background === "black"
          ? "black"
          : "0c0907";

      args.push(
        "-f",
        "lavfi",
        "-i",
        `color=c=${backgroundColor}:s=1280x720:r=30`,
        "-i",
        audioName
      );
    }

    args.push(
      "-map",
      "0:v:0",
      "-map",
      "1:a:0"
    );

    if (imageFile) {
      args.push(
        "-vf",
        "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0c0907"
      );
    }

    args.push(
      "-r",
      "30",
      "-c:v",
      outputConfig.videoCodec,
      "-c:a",
      outputConfig.audioCodec,
      ...outputConfig.args,
      "-shortest",
      "-y",
      outputName
    );

    const exitCode =
      await ffmpeg.exec(args);

    if (signal?.aborted) {
      throw new DOMException(
        "Conversion cancelled.",
        "AbortError"
      );
    }

    if (exitCode !== 0) {
      throw new Error(
        "Audio to video conversion failed."
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
        audioFile.name
      )}-video.${outputConfig.extension}`,
      size: blob.size,
      mimeType:
        outputConfig.mimeType,
      format:
        outputConfig.extension,
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
        audioName
      );
    } catch {
      // Ignore cleanup failure.
    }

    if (imageName) {
      try {
        await ffmpeg.deleteFile(
          imageName
        );
      } catch {
        // Ignore cleanup failure.
      }
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