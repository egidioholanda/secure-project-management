import type jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { addCanvasAsPdfPages } from "./paginateCanvasToPdf";

const PAGE_STYLES = `
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  table, th, td { border: 1px solid #d1d5db; }
  th, td { padding: 4px 8px; text-align: left; }
  img { max-width: 100%; height: auto; }
  p { margin: 0 0 8px 0; }
  h1, h2, h3 { margin: 0 0 8px 0; }
`;

/**
 * Renders an arbitrary HTML string off-screen at A4 width, screenshots it,
 * and slices the result into as many PDF pages as its rendered height requires.
 * `ensurePage` decides whether to start a new PDF page or reuse the current one —
 * shared with the rest of the proposal export so pagination stays continuous.
 */
export const renderHtmlToPdfPages = async (
  pdf: jsPDF,
  html: string,
  ensurePage: () => void,
  sideMargin = 8
): Promise<void> => {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "210mm";
  container.style.background = "#ffffff";
  container.style.padding = "10mm";
  container.style.boxSizing = "border-box";
  container.style.fontFamily = "Arial, Helvetica, sans-serif";
  container.style.fontSize = "12px";
  container.style.color = "#111827";
  container.innerHTML = `<style>${PAGE_STYLES}</style>${html}`;
  document.body.appendChild(container);

  try {
    const images = Array.from(container.querySelectorAll("img"));
    await Promise.all(
      images.map((img) => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve()))
    );

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    addCanvasAsPdfPages(pdf, canvas, ensurePage, {
      sideMargin,
      scale: 2,
      container,
      avoidBreakSelector: "p, tr, li, h1, h2, h3, h4",
    });
  } finally {
    document.body.removeChild(container);
  }
};
