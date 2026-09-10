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
};

export default toolComponents;