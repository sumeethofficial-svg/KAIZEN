import MergePdf from "./pdf/merge/MergePdf.jsx";
import SplitPdf from "./pdf/split/SplitPdf.jsx";
import OrganizePages from "./pdf/organize/OrganizePages.jsx";
import RotatePdf from "./pdf/rotate/RotatePdf.jsx";
import PdfToJpg from "./pdf/pdf-to-jpg/PdfToJpg.jsx";
import CompressPdf from "./pdf/compress/CompressPdf.jsx";
import AlternateAndMix from "./pdf/alternate-mix/AlternateAndMix.jsx";
import PagesPerSheet from "./pdf/pages-per-sheet/PagesPerSheet.jsx";
import FlipMirrorPdf from "./pdf/flip-mirror/FlipMirrorPdf.jsx";
import CropResizePdf from "./pdf/crop-resize/CropResizePdf.jsx";
import PdfToZip from "./pdf/pdf-to-zip/PdfToZip.jsx";

import EditPdf from "./pdf/edit/EditPdf.jsx";
import SignPdf from "./pdf/sign/SignPdf.jsx";
import FillPdfForm from "./pdf/fill-pdf-form/FillPdfForm.jsx";
import RedactPdf from "./pdf/redact/RedactPdf.jsx";
import AddWatermark from "./pdf/add-watermark/AddWatermark.jsx";
import PageNumbers from "./pdf/page-numbers/PageNumbers.jsx";
import BatesNumbering from "./pdf/bates-numbering/BatesNumbering.jsx";
import HeadersFooters from "./pdf/headers-footers/HeadersFooters.jsx";
import FlattenPdf from "./pdf/flatten-pdf/FlattenPdf.jsx";
import EditMetadata from "./pdf/edit-metadata/EditMetadata.jsx";
import InvertPdfColours from "./pdf/invert-pdf-colours/InvertPdfColours.jsx";

import EncryptPdf from "./pdf/encrypt-pdf/EncryptPdf.jsx";
import RemovePassword from "./pdf/remove-password/RemovePassword.jsx";
import UnlockPdf from "./pdf/unlock-pdf/UnlockPdf.jsx";

import WordToPdf from "./pdf/word-to-pdf/WordToPdf.jsx";
import ImagesToPdf from "./pdf/images-to-pdf/ImagesToPdf.jsx";
import ExcelToPdf from "./pdf/excel-to-pdf/ExcelToPdf.jsx";
import PowerpointToPdf from "./pdf/powerpoint-to-pdf/PowerpointToPdf.jsx";
import HtmlToPdf from "./pdf/html-to-pdf/HtmlToPdf.jsx";
import CreatePdf from "./pdf/create-pdf/CreatePdf.jsx";
import MarkdownToPdf from "./pdf/markdown-to-pdf/MarkdownToPdf.jsx";
import CsvToPdf from "./pdf/csv-to-pdf/CsvToPdf.jsx";
import AudioToPdf from "./pdf/audio-to-pdf/AudioToPdf.jsx";
import EbookToPdf from "./pdf/ebook-to-pdf/EbookToPdf.jsx";

import ConvertImage from "./images/ConvertImage.jsx";
import CompressImage from "./images/CompressImage.jsx";
import ResizeImage from "./images/ResizeImage.jsx";
import FixedSizeImage from "./images/FixedSizeImage.jsx";
import EnhanceImage from "./images/EnhanceImage.jsx";
import UpscaleImage from "./images/UpscaleImage.jsx";
import CropImage from "./images/CropImage.jsx";
import RotateImage from "./images/RotateImage.jsx";
import ImageToPdf from "./images/ImageToPdf.jsx";
import RemoveImageMetadata from "./images/RemoveImageMetadata.jsx";
import ImageAdjust from "./images/ImageAdjust.jsx";
import SharpenImage from "./images/SharpenImage.jsx";
import DenoiseImage from "./images/DenoiseImage.jsx";

import VideoTrimmer from "./video/trimmer/VideoTrimmer.jsx";
import VideoCutter from "./video/cutter/VideoCutter.jsx";
import JoinVideos from "./video/join-videos/JoinVideos.jsx";
import VideoCompressor from "./video/compressor/VideoCompressor.jsx";
import VideoEnhancer from "./video/VideoEnhancer.jsx";
import VideoResizer from "./video/VideoResizer.jsx";
import ChangeVideoFps from "./video/ChangeVideoFps.jsx";
import VideoConverter from "./video/VideoConverter.jsx";
import VideoToGif from "./video/VideoToGif.jsx";
import GifToVideo from "./video/GifToVideo.jsx";
import ExtractVideoAudio from "./video/ExtractVideoAudio.jsx";
import MuteVideo from "./video/MuteVideo.jsx";
import ChangeVideoSpeed from "./video/ChangeVideoSpeed.jsx";
import RotateVideo from "./video/RotateVideo.jsx";
;

import AudioConverter from "./audio/AudioConverter.jsx";
import AudioCompressor from "./audio/AudioCompressor.jsx";
import AudioTrimmer from "./audio/AudioTrimmer.jsx";
import JoinAudio from "./audio/JoinAudio.jsx";
import AudioChangeSpeed from "./audio/AudioChangeSpeed.jsx";
import AudioToVideo from "./audio/AudioToVideo.jsx";
import VideoToAudio from "./audio/VideoToAudio.jsx";
import AudioRecorder from "./audio/AudioRecorder.jsx";

import DocumentToPdf from "./documents/DocumentToPdf.jsx";
import PdfToDocument from "./documents/PdfToDocument.jsx";
import TextToPdf from "./documents/TextToPdf.jsx";
import MarkdownConverter from "./documents/MarkdownConverter.jsx";
import ExtractDocumentText from "./documents/ExtractDocumentText.jsx";
import WordCounter from "./documents/WordCounter.jsx";
import TextCleaner from "./documents/TextCleaner.jsx";

import ExtractZip from "./utilities/ExtractZip.jsx";
import FileMetadata from "./utilities/FileMetadata.jsx";
import BatchRename from "./utilities/BatchRename.jsx";

const toolComponents = {
  "merge-pdf": MergePdf,
  "split-pdf": SplitPdf,
  "organize-pages": OrganizePages,
  "rotate-pdf": RotatePdf,
  "pdf-to-jpg": PdfToJpg,
  "compress-pdf": CompressPdf,
  "alternate-mix": AlternateAndMix,
  "pages-per-sheet": PagesPerSheet,
  "flip-mirror-pdf": FlipMirrorPdf,
  "crop-resize-pdf": CropResizePdf,
  "pdf-to-zip": PdfToZip,

  "edit-pdf": EditPdf,
  "sign-pdf": SignPdf,
  "fill-pdf-form": FillPdfForm,
  "redact-pdf": RedactPdf,
  "add-watermark": AddWatermark,
  "page-numbers": PageNumbers,
  "bates-numbering": BatesNumbering,
  "headers-footers": HeadersFooters,
  "flatten-pdf": FlattenPdf,
  "edit-metadata": EditMetadata,
  "invert-pdf-colours": InvertPdfColours,

  "encrypt-pdf": EncryptPdf,
  "remove-pdf-password": RemovePassword,
  "unlock-pdf": UnlockPdf,

  "word-to-pdf": WordToPdf,
  "images-to-pdf": ImagesToPdf,
  "excel-to-pdf": ExcelToPdf,
  "powerpoint-to-pdf": PowerpointToPdf,
  "html-to-pdf": HtmlToPdf,
  "create-pdf": CreatePdf,
  "markdown-to-pdf": MarkdownToPdf,
  "csv-to-pdf": CsvToPdf,
  "audio-to-pdf": AudioToPdf,
  "ebook-to-pdf": EbookToPdf,

  "convert-image": ConvertImage,
  "compress-image": CompressImage,
  "resize-image": ResizeImage,
  "fixed-size-image": FixedSizeImage,
  "enhance-image": EnhanceImage,
  "upscale-image": UpscaleImage,
  "crop-image": CropImage,
  "rotate-image": RotateImage,
  "image-to-pdf": ImageToPdf,
  "remove-image-metadata": RemoveImageMetadata,
  "image-adjust": ImageAdjust,
  "sharpen-image": SharpenImage,
  "denoise-image": DenoiseImage,

  "video-trimmer": VideoTrimmer,
  "video-cutter": VideoCutter,
  "join-videos": JoinVideos,
  "video-compressor": VideoCompressor,
  "enhance-video": VideoEnhancer,
  "resize-video": VideoResizer,
  "change-video-fps": ChangeVideoFps,
  "convert-video": VideoConverter,
  "video-to-gif": VideoToGif,
  "gif-to-video": GifToVideo,
  "extract-video-audio": ExtractVideoAudio,
  "mute-video": MuteVideo,
  "change-video-speed": ChangeVideoSpeed,
  "rotate-video": RotateVideo,

  "convert-audio": AudioConverter,
  "compress-audio": AudioCompressor,
  "audio-trimmer": AudioTrimmer,
  "join-audio": JoinAudio,
  "audio-change-speed": AudioChangeSpeed,
  "audio-to-video": AudioToVideo,
  "video-to-audio": VideoToAudio,
  "audio-recorder": AudioRecorder,

  "document-to-pdf": DocumentToPdf,
  "pdf-to-document": PdfToDocument,
  "text-to-pdf": TextToPdf,
  "markdown-to-document": MarkdownConverter,
  "extract-document-text": ExtractDocumentText,
  "document-word-counter": WordCounter,
  "document-cleaner": TextCleaner,

  "extract-zip": ExtractZip,
  "file-metadata": FileMetadata,
  "file-renamer": BatchRename,
};

export default toolComponents;