import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { format } from "date-fns";

export const exportScheduleToPDF = async (
  element: HTMLElement,
  filenamePrefix = "cronograma"
): Promise<void> => {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    allowTaint: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = pdfWidth / imgWidth;
  const scaledHeight = imgHeight * ratio;
  const totalPages = Math.ceil(scaledHeight / pdfHeight);

  for (let i = 0; i < totalPages; i++) {
    if (i > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      0,
      -(i * pdfHeight),
      pdfWidth,
      scaledHeight
    );
  }

  const fileName = `${filenamePrefix}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
  pdf.save(fileName);
};
