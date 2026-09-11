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
};

export default toolComponents;