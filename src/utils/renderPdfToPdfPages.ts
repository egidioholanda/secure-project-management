import type jsPDF from "jspdf";
import { pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Renders every page of a ready-made PDF (e.g. a Word doc exported to PDF for
 * perfect visual fidelity) as an image and adds each as its own page to `pdf`.
 * `ensurePage` decides whether to start a new PDF page or reuse the current
 * one — shared with the rest of the proposal export so pagination stays continuous.
 */
export const renderPdfToPdfPages = async (
  pdf: jsPDF,
  fileUrl: string,
  ensurePage: () => void
): Promise<void> => {
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const doc = await pdfjs.getDocument(fileUrl).promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const imgData = canvas.toDataURL("image/png");
    const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
    const scaledWidth = canvas.width * ratio;
    const scaledHeight = canvas.height * ratio;
    const x = (pdfWidth - scaledWidth) / 2;
    const y = (pdfHeight - scaledHeight) / 2;

    ensurePage();
    pdf.addImage(imgData, "PNG", x, y, scaledWidth, scaledHeight);
  }
};
