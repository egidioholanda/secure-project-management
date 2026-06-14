import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Report } from "@/types/report";
import { format } from "date-fns";

export const exportReportToPDF = async (
  report: Report,
  element: HTMLElement
): Promise<void> => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const sideMargin = 8;
  const contentWidth = pdfWidth - 2 * sideMargin;

  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = contentWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;
  const totalPages = Math.max(1, Math.ceil((scaledHeight - 1) / pdfHeight));

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) {
      pdf.addPage();
    }
    pdf.addImage(
      imgData,
      "PNG",
      sideMargin,
      -i * pdfHeight,
      contentWidth,
      scaledHeight
    );
  }

  const fileName = `relatorio-${report.title
    .toLowerCase()
    .replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
};
