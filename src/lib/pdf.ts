import type { PDFDocumentProxy } from "pdfjs-dist";
import { db, type Book } from "./db";
let pdfModule: Promise<typeof import("pdfjs-dist")> | undefined;
export async function getPdfJs() {
  const pdf = await (pdfModule ??= import("pdfjs-dist"));
  pdf.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdf;
}
export async function loadPdf(blob: Blob): Promise<PDFDocumentProxy> {
  const pdf = await getPdfJs();
  return pdf.getDocument({ data: new Uint8Array(await blob.arrayBuffer()), cMapUrl: "/cmaps/", cMapPacked: true, standardFontDataUrl: "/standard_fonts/", wasmUrl: "/wasm/", isEvalSupported: false }).promise;
}
export async function importPdf(file: File): Promise<Book> {
  if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") throw new Error("Please choose a PDF file.");
  if (file.size > 250 * 1024 * 1024) throw new Error("This PDF is over 250 MB. Try a smaller file for a smoother reading experience.");
  let document: PDFDocumentProxy | undefined;
  try {
    document = await loadPdf(file);
    const page = await document.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(600 / natural.width, 900 / natural.height) });
    const canvas = window.document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create a book cover.");
    await page.render({ canvasContext: context, canvas, viewport }).promise;
    const coverBlob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Could not create the cover.")), "image/webp", .86));
    const metadata = await document.getMetadata().catch(() => null);
    const info = metadata?.info as { Title?: string; Author?: string } | undefined;
    const title = info?.Title?.trim();
    const book: Book = { id: crypto.randomUUID(), title: title && title !== "Untitled" ? title : file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "), author: info?.Author?.trim() || "Personal library", filename: file.name, pdfBlob: file, coverBlob, totalPages: document.numPages, currentPage: 1, progress: 0, favorite: false, dateAdded: Date.now(), lastOpened: 0, collectionIds: [], size: file.size, color: "#e7e4dc" };
    await db.books.add(book);
    return book;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException") throw new Error("This PDF is password protected. Import an unlocked copy to read it in Folio.");
    if (error instanceof Error && error.name === "InvalidPDFException") throw new Error("This file isn’t a readable PDF. Try another copy.");
    if (error instanceof Error && /quota/i.test(error.name)) throw new Error("Your device’s storage is full. Remove a book or free up space and try again.");
    throw error;
  } finally { await document?.destroy(); }
}
