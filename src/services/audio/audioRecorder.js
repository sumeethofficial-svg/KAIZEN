const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

export function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function getAudioFileExtension(mimeType = "") {
  const normalized = mimeType.toLowerCase();

  if (normalized.includes("ogg")) {
    return "ogg";
  }

  if (normalized.includes("mp4")) {
    return "m4a";
  }

  return "webm";
}

export function createAudioRecorder(stream, options = {}) {
  if (typeof MediaRecorder === "undefined") {
    throw new Error(
      "Audio recording is not supported by this browser."
    );
  }

  if (!stream) {
    throw new Error("A microphone stream is required.");
  }

  const mimeType =
    options.mimeType || getSupportedAudioMimeType();

  const recorderOptions = {};

  if (mimeType) {
    recorderOptions.mimeType = mimeType;
  }

  if (options.audioBitsPerSecond) {
    recorderOptions.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  return new MediaRecorder(stream, recorderOptions);
}

export function createAudioDownloadUrl(blob) {
  if (!(blob instanceof Blob) || blob.size === 0) {
    return "";
  }

  return URL.createObjectURL(blob);
}

export function revokeAudioDownloadUrl(url) {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function formatRecordingTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
}

export function getRecordingFileName(mimeType = "") {
  const extension = getAudioFileExtension(mimeType);

  const date = new Date();

  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    "-",
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");

  return `kaizen-recording-${stamp}.${extension}`;
}