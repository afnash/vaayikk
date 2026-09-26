"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { motion } from "framer-motion";
import { ArrowLeft, Bookmark as BookmarkIcon, BookOpen, Check, ChevronLeft, ChevronRight, Expand, List, LoaderCircle, Maximize, Minus, Moon, MoreHorizontal, Plus, Sun, Trash2 } from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { db, saveProgress, toggleBookmark, type Book } from "@/lib/db";
import { loadPdf } from "@/lib/pdf";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

interface Props { book: Book; theme: string; onThemeChange: (theme: string) => void; onClose: () => void; onError: (message: string) => void }
export function Reader({ book, theme, onThemeChange, onClose, onError }: Props) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(book.currentPage);
  const [controls, setControls] = useState(true);
  const [panel, setPanel] = useState<"bookmarks" | "options" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retry, setRetry] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [direction, setDirection] = useState(1);
  const [pageText, setPageText] = useState("");
  const stage = useRef<HTMLDivElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const initialBlob = useRef(book.pdfBlob);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, lastX: 0, lastY: 0, distance: 0, zoom: 1, panX: 0, panY: 0, pinched: false });
  const marks = useLiveQuery(() => db.bookmarks.where("bookId").equals(book.id).sortBy("pageNumber"), [book.id], []);
  const marked = marks.some(mark => mark.pageNumber === page);
  const total = document?.numPages || book.totalPages;
  const reportError = useRef(onError);
  reportError.current = onError;

  useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | undefined;
    setLoadError(""); setLoading(true);
    loadPdf(initialBlob.current).then(pdf => { loaded = pdf; if (cancelled) { void pdf.destroy(); return; } setDocument(pdf); setPage(p => Math.min(p, pdf.numPages)); }).catch(error => { if (!cancelled) { setLoading(false); setLoadError(error.message || "This book could not be opened."); } });
    return () => { cancelled = true; if (loaded) void loaded.destroy(); };
  }, [retry]);

  useEffect(() => {
    const old = window.document.body.style.overflow;
    const previouslyFocused = window.document.activeElement as HTMLElement | null;
    backButton.current?.focus();
    window.document.body.style.overflow = "hidden";
    const observer = new ResizeObserver(entries => { const rect = entries[0].contentRect; setSize({ width: Math.max(1, rect.width - 32), height: Math.max(1, rect.height - 28) }); });
    if (stage.current) observer.observe(stage.current);
    return () => { observer.disconnect(); window.document.body.style.overflow = old; previouslyFocused?.focus(); if (window.document.fullscreenElement) void window.document.exitFullscreen().catch(() => {}); };
  }, []);

  useEffect(() => {
    if (!document || !size.width || !size.height) return;
    let cancelled = false; let task: RenderTask | undefined;
    setLoading(true); setLoadError("");
    (async () => {
      const pdfPage = await document.getPage(page);
      if (cancelled) return;
      const natural = pdfPage.getViewport({ scale: 1 });
      const scale = Math.min(size.width / natural.width, size.height / natural.height);
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = pdfPage.getViewport({ scale: scale * density });
      const buffer = window.document.createElement("canvas");
      buffer.width = Math.ceil(viewport.width); buffer.height = Math.ceil(viewport.height);
      const context = buffer.getContext("2d");
      if (!context) throw new Error("Your browser could not render this page.");
      task = pdfPage.render({ canvas: buffer, canvasContext: context, viewport });
      await task.promise;
      if (cancelled || !canvas.current) return;
      canvas.current.width = buffer.width; canvas.current.height = buffer.height;
      canvas.current.getContext("2d")?.drawImage(buffer, 0, 0);
      setPageSize({ width: viewport.width / density, height: viewport.height / density });
      setLoading(false);
      await saveProgress(book.id, page, document.numPages).catch(() => reportError.current("Your reading position couldn’t be saved. Check your device’s free space."));
      const text = await pdfPage.getTextContent();
      if (!cancelled) setPageText(text.items.map(item => "str" in item ? item.str : "").join(" "));
    })().catch(error => { if (!cancelled && error?.name !== "RenderingCancelledException") { setLoadError("This page couldn’t be displayed. Try another page or reopen the book."); setLoading(false); } });
    return () => { cancelled = true; task?.cancel(); };
  }, [document, page, size, book.id]);

  const goTo = useCallback((next: number) => {
    const bounded = Math.max(1, Math.min(total, next));
    setDirection(bounded >= page ? 1 : -1); setPage(bounded); setZoom(1); setPan({ x: 0, y: 0 });
  }, [page, total]);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (panel || (event.target as HTMLElement).matches("input, select, textarea")) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); goTo(page + 1); }
      if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); goTo(page - 1); }
      if (event.key === "Escape") { if (zoom > 1) { setZoom(1); setPan({ x: 0, y: 0 }); } else onClose(); }
      if (event.key === " " && !(event.target as HTMLElement).closest("button")) { event.preventDefault(); setControls(value => !value); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goTo, page, panel, zoom, onClose]);
  const bookmarkPage = async () => { try { await toggleBookmark(book.id, page); } catch { onError("This bookmark couldn’t be saved. Please try again."); } };
  const changeZoom = (next: number) => { setZoom(Math.min(4, Math.max(1, next))); if (next <= 1) setPan({ x: 0, y: 0 }); };
  const fullscreen = async () => { try { if (window.document.fullscreenElement) await window.document.exitFullscreen(); else await window.document.documentElement.requestFullscreen(); setPanel(null); } catch { onError("Fullscreen isn’t available in this browser. Install Folio for a full-screen reading experience."); } };

  return <div className={`reader theme-${theme} ${!controls ? "immersive" : ""}`} role="dialog" aria-modal="true" aria-label={`Reading ${book.title}`}>
    <header className={`reader-toolbar ${!controls ? "controls-hidden" : ""}`} inert={!controls}><Button ref={backButton} variant="ghost" size="icon" onClick={onClose} aria-label="Back to library"><ArrowLeft size={22} /></Button><div className="reader-title"><strong>{book.title}</strong><span>{book.author}</span></div><Button variant="ghost" size="icon" className={marked ? "bookmarked" : ""} onClick={() => void bookmarkPage()} aria-label={marked ? "Remove bookmark" : "Bookmark this page"}><BookmarkIcon size={21} fill={marked ? "currentColor" : "none"} /></Button><Button variant="ghost" size="icon" onClick={() => setPanel("options")} aria-label="Reader options"><MoreHorizontal size={23} /></Button></header>
    <div ref={stage} className={`reader-stage ${zoom > 1 ? "is-zoomed" : ""}`} onPointerDown={event => {
      if ((event.target as HTMLElement).closest("button")) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size === 1) gesture.current = { x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, distance: 0, zoom, panX: pan.x, panY: pan.y, pinched: false };
      else if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; gesture.current.distance = Math.hypot(a.x - b.x, a.y - b.y); gesture.current.zoom = zoom; gesture.current.pinched = true; }
    }} onPointerMove={event => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.current.size >= 2) { const [a, b] = [...pointers.current.values()]; if (gesture.current.distance) changeZoom(gesture.current.zoom * Math.hypot(a.x - b.x, a.y - b.y) / gesture.current.distance); }
      else if (zoom > 1) {
        const maxX = Math.max(0, (pageSize.width * zoom - size.width) / 2 + 30); const maxY = Math.max(0, (pageSize.height * zoom - size.height) / 2 + 30);
        setPan({ x: Math.min(maxX, Math.max(-maxX, gesture.current.panX + event.clientX - gesture.current.x)), y: Math.min(maxY, Math.max(-maxY, gesture.current.panY + event.clientY - gesture.current.y)) });
      }
      gesture.current.lastX = event.clientX; gesture.current.lastY = event.clientY;
    }} onPointerUp={event => {
      if (!pointers.current.has(event.pointerId)) return;
      pointers.current.delete(event.pointerId);
      if (pointers.current.size) { const [remaining] = [...pointers.current.values()]; gesture.current.x = remaining.x; gesture.current.y = remaining.y; gesture.current.panX = pan.x; gesture.current.panY = pan.y; return; }
      const deltaX = event.clientX - gesture.current.x; const deltaY = event.clientY - gesture.current.y;
      if (gesture.current.pinched) return;
      if (zoom > 1) { if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) setControls(value => !value); return; }
      if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY)) { goTo(page + (deltaX < 0 ? 1 : -1)); return; }
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const bounds = event.currentTarget.getBoundingClientRect(); const position = (event.clientX - bounds.left) / bounds.width;
        if (position < .28) goTo(page - 1); else if (position > .72) goTo(page + 1); else setControls(value => !value);
      }
    }} onPointerCancel={event => { pointers.current.delete(event.pointerId); gesture.current.pinched = true; }}>
      <motion.div key={page} className="pdf-page-motion" initial={{ opacity: .6, x: direction * 14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .18 }}><div className="pdf-page-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}><canvas ref={canvas} style={{ width: pageSize.width || undefined, height: pageSize.height || undefined, visibility: loading || loadError ? "hidden" : "visible" }} role="img" aria-label={`Page ${page} of ${total} of ${book.title}`} /><div className="sr-only">{pageText}</div></div></motion.div>
      {loading && <div className="page-loading" role="status"><LoaderCircle className="spin" size={26} /><span>Turning to your page…</span></div>}
      {loadError && <div className="reader-error" role="alert"><BookOpen size={32} /><h3>A small interruption.</h3><p>{loadError}</p><Button onClick={() => { setDocument(undefined); setRetry(n => n + 1); }}>Try again</Button><Button variant="ghost" onClick={onClose}>Back to your library</Button></div>}
      {zoom > 1 && controls && <button className="zoom-reset" onClick={() => changeZoom(1)}><Maximize size={15} />{Math.round(zoom * 100)}% · Reset</button>}
    </div>
    <footer className={`reader-bottom ${!controls ? "controls-hidden" : ""}`} inert={!controls}><div className="reader-page-controls"><Button variant="ghost" size="icon" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={22} /></Button><div className="reader-page-count"><strong>{page}</strong><span>/</span><span>{total}</span></div><Button variant="ghost" size="icon" onClick={() => goTo(page + 1)} disabled={page >= total} aria-label="Next page"><ChevronRight size={22} /></Button></div><input className="page-slider" type="range" min={1} max={total} value={page} onChange={event => goTo(Number(event.target.value))} aria-label="Reading progress" aria-valuetext={`Page ${page} of ${total}`} style={{ background: `linear-gradient(to right, var(--accent) ${(page - 1) / Math.max(1, total - 1) * 100}%, var(--line) ${(page - 1) / Math.max(1, total - 1) * 100}%)` }} /><div className="reader-bottom-meta"><button onClick={() => setPanel("bookmarks")}><BookmarkIcon size={14} />{marks.length ? `${marks.length} bookmark${marks.length === 1 ? "" : "s"}` : "Bookmarks"}</button><span>Tap the center to settle in.</span><span>{Math.round(page / total * 100)}% read</span></div></footer>
    <Sheet open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }} title={panel === "bookmarks" ? "Places worth coming back to" : "Settle into your story"}>
      {panel === "bookmarks" ? <div className="bookmark-panel">{marks.length ? marks.map(mark => <div key={mark.id}><button onClick={() => { goTo(mark.pageNumber); setPanel(null); }}><BookmarkIcon size={19} fill="currentColor" /><span>Page {mark.pageNumber}</span>{mark.pageNumber === page && <small>You’re here</small>}</button><Button variant="ghost" size="icon" aria-label={`Delete bookmark on page ${mark.pageNumber}`} onClick={() => void db.bookmarks.delete(mark.id).catch(() => onError("This bookmark couldn’t be removed."))}><Trash2 size={16} /></Button></div>) : <div className="empty-bookmarks"><BookmarkIcon size={32} strokeWidth={1.3} /><h3>Save a page for later.</h3><p>Tap the bookmark icon while reading.<br />Your favorite places will be right here.</p></div>}<Button variant="outline" onClick={() => void bookmarkPage()}><BookmarkIcon size={17} />{marked ? "Remove this page’s bookmark" : `Bookmark page ${page}`}</Button></div> : <div className="reader-options"><div className="setting-label">READING THEME</div><div className="theme-options">{[{ id: "light", label: "Light", Icon: Sun }, { id: "dark", label: "Dark", Icon: Moon }, { id: "sepia", label: "Sepia", Icon: BookOpen }].map(({ id, label, Icon }) => <button key={id} className={`theme-option theme-${id} ${theme === id ? "selected" : ""}`} aria-pressed={theme === id} onClick={() => onThemeChange(id)}><Icon size={22} /><span>{label}</span>{theme === id && <Check size={14} />}</button>)}</div><div className="zoom-controls"><span>Page zoom</span><Button variant="outline" size="icon" onClick={() => changeZoom(zoom - .25)} disabled={zoom <= 1} aria-label="Zoom out"><Minus size={17} /></Button><span>{Math.round(zoom * 100)}%</span><Button variant="outline" size="icon" onClick={() => changeZoom(zoom + .25)} disabled={zoom >= 4} aria-label="Zoom in"><Plus size={17} /></Button></div><div className="action-list"><button onClick={() => setPanel("bookmarks")}><List size={19} />Your bookmarks<span>{marks.length}</span></button><button onClick={() => void fullscreen()}><Expand size={19} />Toggle fullscreen</button><button onClick={() => { setControls(false); setPanel(null); }}><BookOpen size={19} />Hide controls & get comfortable</button></div><p className="reader-tip">Swipe to turn pages. Pinch to take a closer look.<br />When zoomed in, drag to move around the page.</p></div>}
    </Sheet>
  </div>;
}
