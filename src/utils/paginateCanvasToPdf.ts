import type jsPDF from "jspdf";

export interface PaginateCanvasOptions {
  /** Side margin in mm applied to the left of every page. */
  sideMargin?: number;
  /** html2canvas `scale` used to produce `canvas`, to convert DOM px into canvas px. */
  scale?: number;
  /** DOM node the canvas was captured from — used to locate `avoidBreakSelector` elements. */
  container?: HTMLElement | null;
  /** Selector for elements that must never be split across a page boundary (e.g. table rows). */
  avoidBreakSelector?: string;
}

/**
 * Slices a tall canvas into as many PDF pages as its height requires, shifting
 * page breaks earlier when they'd otherwise fall in the middle of an element
 * matched by `avoidBreakSelector` (so a table row, totals box, etc. is never
 * cut in half between two pages).
 */
export const addCanvasAsPdfPages = (
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  ensurePage: () => void,
  opts: PaginateCanvasOptions = {}
): void => {
  const sideMargin = opts.sideMargin ?? 8;
  const scale = opts.scale ?? 2;
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pdfWidth - 2 * sideMargin;

  const ratio = contentWidth / canvas.width; // mm per canvas px
  const pageHeightPx = pdfHeight / ratio; // canvas px equivalent to one physical page

  let forbiddenZones: { top: number; bottom: number }[] = [];
  if (opts.container && opts.avoidBreakSelector) {
    const containerRect = opts.container.getBoundingClientRect();
    forbiddenZones = Array.from(opts.container.querySelectorAll<HTMLElement>(opts.avoidBreakSelector))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          top: (r.top - containerRect.top) * scale,
          bottom: (r.bottom - containerRect.top) * scale,
        };
      })
      .sort((a, b) => a.top - b.top);
  }

  const breakpoints = [0];
  let cursor = 0;
  let guard = 0;
  while (cursor < canvas.height - 0.5 && guard < 1000) {
    guard += 1;
    let next = Math.min(cursor + pageHeightPx, canvas.height);
    if (next < canvas.height) {
      const straddling = forbiddenZones.find((z) => z.top < next && next < z.bottom);
      if (straddling && straddling.top > cursor + 1) {
        next = straddling.top;
      }
    }
    breakpoints.push(next);
    cursor = next;
  }

  for (let i = 0; i < breakpoints.length - 1; i++) {
    const sliceStart = breakpoints[i];
    const sliceHeightPx = breakpoints[i + 1] - sliceStart;
    if (sliceHeightPx <= 0) continue;

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeightPx;
    const ctx = pageCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(canvas, 0, sliceStart, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);

    const imgData = pageCanvas.toDataURL("image/png");
    ensurePage();
    pdf.addImage(imgData, "PNG", sideMargin, 0, canvas.width * ratio, sliceHeightPx * ratio);
  }
};
