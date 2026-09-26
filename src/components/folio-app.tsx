"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownUp, ArrowRight, BookOpen, Check, CheckCircle2, ChevronDown, Clock3, Download, Folder, Heart, Info, LayoutGrid, Library, List, LoaderCircle, LockKeyhole, Menu, Moon, MoreHorizontal, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, Trash2, Upload, WifiOff, X } from "lucide-react";
import { db, initializeLibrary, removeBook, type Book } from "@/lib/db";
import { importPdf } from "@/lib/pdf";
import { fileSize } from "@/lib/utils";
import { BookCover } from "./book-cover";
import { Button } from "./ui/button";
import { Sheet } from "./ui/sheet";

const Reader = dynamic(() => import("./reader").then(module => module.Reader), { ssr: false, loading: () => <div className="reader-loading"><LoaderCircle className="spin" /> Opening your book…</div> });
type Panel = "menu" | "details" | "rename" | "collections" | "new-collection" | "remove" | "settings" | null;
type Filter = "All books" | "Reading" | "Finished" | "Favorites";
interface InstallPrompt extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
const filters: Filter[] = ["All books", "Reading", "Finished", "Favorites"];

export function FolioApp() {
  const books = useLiveQuery(() => db.books.orderBy("dateAdded").reverse().toArray(), [], []);
  const collections = useLiveQuery(() => db.collections.orderBy("createdAt").toArray(), [], []);
  const [ready, setReady] = useState(false);
  const [initialError, setInitialError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All books");
  const [section, setSection] = useState("library");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sort, setSort] = useState("recent");
  const [panel, setPanel] = useState<Panel>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [readerId, setReaderId] = useState<string>();
  const [formValue, setFormValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean }>();
  const [theme, setTheme] = useState("light");
  const [mobileNav, setMobileNav] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt>();
  const [installed, setInstalled] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const didLongPress = useRef(false);
  const pressStart = useRef({ x: 0, y: 0 });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const selected = books.find(book => book.id === selectedId);
  const readerBook = books.find(book => book.id === readerId);
  const notify = useCallback((text: string, error = false) => { clearTimeout(toastTimer.current); setToast({ text, error }); toastTimer.current = setTimeout(() => setToast(undefined), error ? 7000 : 3800); }, []);
  const perform = useCallback(async (action: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try { await action(); if (success) notify(success); } catch (error) { notify(error instanceof Error ? error.message : "Something went wrong. Please try again.", true); } finally { setBusy(false); }
  }, [notify]);

  useEffect(() => {
    initializeLibrary().then(() => setReady(true)).catch(error => { setInitialError(error.message); setReady(true); });
    db.preferences.get("theme").then(pref => { if (pref) setTheme(pref.value); }).catch(() => {});
    db.preferences.get("view").then(pref => { if (pref?.value === "list") setView("list"); }).catch(() => {});
    setOnline(navigator.onLine);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const updateOnline = () => setOnline(navigator.onLine);
    const onInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setInstallPrompt(undefined); };
    window.addEventListener("online", updateOnline); window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", onInstall); window.addEventListener("appinstalled", onInstalled);
    const onWorker = (event: MessageEvent) => { if (event.data?.type === "OFFLINE_READY") setOfflineReady(true); };
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.addEventListener("message", onWorker);
      navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).then(() => setOfflineReady(true)).catch(() => notify("Offline setup couldn’t finish. Reopen Folio online to try again.", true));
    }
    return () => { window.removeEventListener("online", updateOnline); window.removeEventListener("offline", updateOnline); window.removeEventListener("beforeinstallprompt", onInstall); window.removeEventListener("appinstalled", onInstalled); navigator.serviceWorker?.removeEventListener("message", onWorker); clearTimeout(longPress.current); clearTimeout(toastTimer.current); };
  }, [notify]);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => {
    const handlePop = () => setReaderId(undefined);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const setAppearance = (next: string) => { setTheme(next); void perform(() => db.preferences.put({ key: "theme", value: next })); };
  const setLayout = (next: "grid" | "list") => { setView(next); void perform(() => db.preferences.put({ key: "view", value: next })); };
  const openBook = (book: Book) => { setPanel(null); window.history.pushState({ reader: book.id }, "", `#read-${book.id}`); setReaderId(book.id); void perform(() => db.books.update(book.id, { lastOpened: Date.now() })); };
  const closeReader = () => { setReaderId(undefined); if (window.location.hash.startsWith("#read-")) window.history.back(); };
  const selectSection = (next: string) => { setSection(next); setFilter(next === "favorites" ? "Favorites" : "All books"); setQuery(""); setMobileNav(false); };
  const favorite = (book: Book) => void perform(() => db.books.update(book.id, { favorite: !book.favorite }), book.favorite ? "Removed from favorites" : "Added to your favorites");
  const openPanel = (book: Book, next: Panel = "menu") => { setSelectedId(book.id); setFormValue(book.title); setPanel(next); };
  const install = async () => {
    if (!installPrompt) { setPanel("settings"); return; }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") notify("Folio is coming to your home screen.");
    setInstallPrompt(undefined);
  };
  const importFiles = async (files: FileList | File[]) => {
    if (importing) return;
    let count = 0; const errors: string[] = [];
    for (const file of Array.from(files)) {
      setImporting(file.name);
      try { await importPdf(file); count++; } catch (error) { errors.push(`${file.name}: ${error instanceof Error ? error.message : "Could not import this PDF."}`); }
    }
    setImporting("");
    if (count) { selectSection("library"); notify(`${count === 1 ? "Your book has" : `${count} books have`} found a home.`); void navigator.storage?.persist?.().catch(() => {}); }
    if (errors.length) notify(`${count ? `${count} imported. ` : ""}${errors.join(" ")}`, true);
    if (fileInput.current) fileInput.current.value = "";
  };
  const visibleBooks = useMemo(() => {
    const search = query.toLocaleLowerCase().trim();
    const collectionId = section.startsWith("collection:") ? section.slice(11) : undefined;
    return books.filter(book => {
      if (collectionId && !book.collectionIds.includes(collectionId)) return false;
      if (section === "favorites" && !book.favorite) return false;
      if (filter === "Reading" && (!book.lastOpened || book.progress >= 98)) return false;
      if (filter === "Finished" && book.progress < 98) return false;
      if (filter === "Favorites" && !book.favorite) return false;
      return !search || `${book.title} ${book.filename} ${collections.filter(c => book.collectionIds.includes(c.id)).map(c => c.name).join(" ")}`.toLocaleLowerCase().includes(search);
    }).sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : sort === "opened" ? b.lastOpened - a.lastOpened : b.dateAdded - a.dateAdded);
  }, [books, collections, query, filter, section, sort]);
  const continuing = [...books].filter(book => book.lastOpened && book.progress < 98).sort((a, b) => b.lastOpened - a.lastOpened)[0];
  const featured = continuing || books.find(book => book.id === "noticing") || books[0];
  const totalSize = books.reduce((sum, book) => sum + book.size, 0);
  const currentCollection = collections.find(c => `collection:${c.id}` === section);
  const title = currentCollection?.name || (section === "favorites" ? "Your favorites" : section === "recent" ? "Recently added" : "Your library");
  const nav = <>
    <button className="brand" onClick={() => selectSection("library")} aria-label="Folio home"><span className="brand-icon"><BookOpen size={25} strokeWidth={1.65} /></span><span>folio<span className="brand-dot">.</span></span></button>
    <span className="sidebar-eyebrow">A LITTLE SPACE FOR YOUR BOOKS</span>
    <nav className="primary-nav" aria-label="Library navigation">
      <button className={section === "library" ? "active" : ""} onClick={() => selectSection("library")}><Library size={19} /> My library <span>{books.length}</span></button>
      <button className={section === "recent" ? "active" : ""} onClick={() => { selectSection("recent"); setSort("recent"); }}><Clock3 size={19} /> Recently added</button>
      <button className={section === "favorites" ? "active" : ""} onClick={() => selectSection("favorites")}><Heart size={19} /> Favorites <span>{books.filter(b => b.favorite).length || ""}</span></button>
    </nav>
    <div className="collection-label"><span>YOUR COLLECTIONS</span><button aria-label="Create collection" onClick={() => { setFormValue(""); setPanel("new-collection"); setMobileNav(false); }}><Plus size={17} /></button></div>
    <nav className="collection-nav" aria-label="Collections">{collections.map((collection, i) => <button key={collection.id} className={section === `collection:${collection.id}` ? "active" : ""} onClick={() => selectSection(`collection:${collection.id}`)}><span className={`collection-dot dot-${i % 4}`} />{collection.name}<span className="collection-count">{books.filter(b => b.collectionIds.includes(collection.id)).length}</span></button>)}</nav>
    <button className="new-collection" onClick={() => { setFormValue(""); setPanel("new-collection"); setMobileNav(false); }}><Plus size={16} /> New collection</button>
    <div className="sidebar-bottom"><div className="privacy-card"><span className="privacy-icon"><ShieldCheck size={20} strokeWidth={1.5} /></span><strong>Yours. And only yours.</strong><p>Your books stay on this device.<br />A private little library, always.</p><div className="storage-meter"><span style={{ width: `${Math.min(100, Math.max(4, totalSize / (1024 * 1024 * 1024) * 100))}%` }} /></div><small>{fileSize(totalSize)} of books, stored locally</small></div><button className="sidebar-setting" onClick={() => setPanel("settings")}><Settings2 size={18} /> Settings & appearance</button><div className="sidebar-footer"><span>Made for a slower scroll.</span><span>v1.0</span></div></div>
  </>;

  return <div className="app-shell" onDragOver={event => { if (event.dataTransfer.types.includes("Files")) { event.preventDefault(); setDragging(true); } }} onDrop={event => { event.preventDefault(); setDragging(false); void importFiles(event.dataTransfer.files); }}>
    <aside className="sidebar" inert={!!readerBook}>{nav}</aside>
    <div className="main-shell" inert={!!readerBook}>
      <header className="topbar"><div className="mobile-brand"><Button variant="ghost" size="icon" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></Button><span>folio.</span></div><div className="breadcrumb"><Library size={15} /><span>My reading room</span><span className="breadcrumb-slash">/</span><span>{currentCollection ? "Collections" : "Library"}</span></div><div className="topbar-right"><span className="local-badge"><span className="status-dot" />{!online ? "Enjoying offline" : "On your device. Always."}</span><Button variant="ghost" size="icon" aria-label="Search your library" onClick={() => searchInput.current?.focus()}><Search size={20} /></Button><button className="profile-button" aria-label="Open settings" onClick={() => setPanel("settings")}><span>f.</span></button></div></header>
      <main className="main-content">
        <section className="welcome"><div><div className="eyebrow"><span className="tiny-sun">✳</span> YOUR PERSONAL READING ROOM</div><h1>A little space.<br className="mobile-break" /> A world of stories.</h1><p>Keep your favorites close. Get lost in a good book.</p></div><Button className="import-button" onClick={() => fileInput.current?.click()} disabled={!!importing}>{importing ? <LoaderCircle size={17} className="spin" /> : <Plus size={19} />}<span>{importing ? "Adding your book…" : "Import a book"}</span></Button></section>
        {initialError && <div className="error-banner" role="alert"><Info size={18} /><span>{initialError} You can still try importing your own PDF.</span><Button variant="ghost" size="sm" onClick={() => window.location.reload()}>Retry</Button></div>}
        {section === "library" && !query && <section className="reading-section"><div className="section-heading"><h2>{continuing ? "Continue reading" : "A good place to begin"}</h2><span>A little time, well spent</span></div><div className="reading-grid">{featured ? <motion.article className="continue-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}><button className="featured-cover-wrap" onClick={() => openBook(featured)} aria-label={`Read ${featured.title}`}><div className="cover-shadow" /><BookCover book={featured} className="featured-cover" /></button><div className="continue-copy"><span className="reading-eyebrow"><span />{continuing ? "BACK TO YOUR BOOK" : "MEET YOUR NEXT LITTLE ESCAPE"}</span><h3>{featured.title}</h3><p>{featured.author}</p>{continuing ? <div className="continue-progress"><div><span>Page {featured.currentPage} of {featured.totalPages}</span><strong>{featured.progress}%</strong></div><div className="progress-track"><span style={{ width: `${featured.progress}%` }} /></div></div> : <div className="reading-intro">{featured.sample ? "An original short read on slowing down and seeing the everyday a little differently." : `${featured.totalPages} pages. A new world waiting to be opened.`}</div>}<Button onClick={() => openBook(featured)}>{continuing ? "Continue reading" : "Start reading"}<ArrowRight size={16} /></Button></div><span className="continue-decoration" aria-hidden="true">✳</span></motion.article> : <div className="empty-feature"><BookOpen size={35} /><h3>Your next chapter is waiting.</h3><p>Import a PDF and make yourself at home.</p><Button onClick={() => fileInput.current?.click()}><Plus size={17} />Add your first book</Button></div>}<aside className="quote-card"><div className="quote-eyebrow"><Sparkles size={14} /> A THOUGHT TO SIT WITH</div><span className="quote-mark">“</span><blockquote>There is no friend<br />as loyal as a book.</blockquote><span className="quote-author">— ERNEST HEMINGWAY</span><div className="quote-footer"><span>Less noise. More pages.</span><BookOpen size={25} strokeWidth={1} /></div></aside></div></section>}

        <section className="library-section"><div className="section-heading library-heading"><div className="library-title"><h2>{title}</h2><span className="count-pill">{visibleBooks.length}</span></div><div className="library-controls"><label className="search-box"><Search size={17} /><input ref={searchInput} placeholder="Find your next read…" aria-label="Search books" value={query} onChange={event => setQuery(event.target.value)} />{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}<span className="search-shortcut">⌕</span></label><div className="view-toggle" aria-label="Library view"><button className={view === "grid" ? "active" : ""} onClick={() => setLayout("grid")} aria-label="Grid view" aria-pressed={view === "grid"}><LayoutGrid size={17} /></button><button className={view === "list" ? "active" : ""} onClick={() => setLayout("list")} aria-label="List view" aria-pressed={view === "list"}><List size={19} /></button></div></div></div>
          <div className="filter-row"><div className="filter-tabs" role="group" aria-label="Filter library">{filters.map(item => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item === "Favorites" && <Heart size={13} />}{item}</button>)}</div><label className="sort-control"><ArrowDownUp size={13} /><select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort books"><option value="recent">Recently added</option><option value="title">Title, A–Z</option><option value="opened">Last opened</option></select><ChevronDown size={13} /></label></div>
          {!ready ? <div className="library-loading"><LoaderCircle className="spin" size={24} /><p>Making a little room for your books…</p></div> : visibleBooks.length === 0 ? <div className="empty-state"><span><BookOpen size={31} strokeWidth={1.3} /></span><h3>{query ? "No books found" : filter === "Favorites" || section === "favorites" ? "Keep the good ones close." : filter === "Finished" ? "Every last page is a little achievement." : filter === "Reading" ? "A new chapter is waiting." : "Room for something wonderful."}</h3><p>{query ? `No matches for “${query}”. Try a title, filename, or collection.` : filter === "Favorites" || section === "favorites" ? "Tap the heart on a book to keep it here." : filter === "Reading" ? "Open a book and your reading journey will show up here." : filter === "Finished" ? "Books you finish will find a home here." : currentCollection ? "Open a book’s menu to add it to this collection." : "Bring a PDF. We’ll save your place."}</p>{query ? <Button variant="outline" onClick={() => setQuery("")}>Clear search</Button> : !currentCollection && filter === "All books" && section !== "favorites" ? <Button onClick={() => fileInput.current?.click()}><Plus size={17} />Import a book</Button> : <Button variant="outline" onClick={() => selectSection("library")}>Explore your library</Button>}</div> : <motion.div layout className={`book-grid ${view === "list" ? "book-list" : ""}`}>{visibleBooks.map((book, index) => <motion.article layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .045, .27), duration: .3 }} className="book-card" key={book.id}>
            <div className="book-art" style={{ backgroundColor: `${book.color}38` }} onContextMenu={event => { event.preventDefault(); openPanel(book); }}><button className="book-open" aria-label={`Read ${book.title}`} onPointerDown={event => { if (event.button !== 0) return; didLongPress.current = false; pressStart.current = { x: event.clientX, y: event.clientY }; longPress.current = setTimeout(() => { didLongPress.current = true; openPanel(book); }, 550); }} onPointerUp={() => clearTimeout(longPress.current)} onPointerCancel={() => clearTimeout(longPress.current)} onPointerMove={event => { if (Math.hypot(event.clientX - pressStart.current.x, event.clientY - pressStart.current.y) > 8) clearTimeout(longPress.current); }} onClick={() => { if (!didLongPress.current) openBook(book); }}><BookCover book={book} /></button><button className={`book-heart ${book.favorite ? "is-favorite" : ""}`} aria-label={`${book.favorite ? "Unfavorite" : "Favorite"} ${book.title}`} onClick={() => favorite(book)}><Heart size={15} fill={book.favorite ? "currentColor" : "none"} /></button>{book.progress >= 98 && <span className="finished-badge"><Check size={11} /> Finished</span>}</div>
            <div className="book-meta"><div className="book-title-row"><button className="book-title" onClick={() => openBook(book)}>{book.title}</button><button className="book-menu" aria-label={`Options for ${book.title}`} onClick={() => openPanel(book)}><MoreHorizontal size={18} /></button></div><p>{book.author}</p><div className="book-progress-label"><span>{book.progress >= 98 ? "A chapter well closed" : book.lastOpened ? `${book.progress}% read` : "Not started"}</span><span>{book.totalPages} pages</span></div><div className="progress-track"><span style={{ width: `${book.progress}%` }} /></div></div>
          </motion.article>)}</motion.div>}
          {ready && books.some(book => book.sample) && section === "library" && !query && <div className="sample-note"><Sparkles size={14} /><span>A few little reads, on us. Add your own books to make this space yours.</span></div>}
        </section>
        <footer className="main-footer"><span><LockKeyhole size={13} /> Your library lives here. No accounts. No cloud.</span><span><span className="status-dot" />{offlineReady ? "Ready for offline reading" : !online ? "You’re offline" : "Your own little corner of the internet"}</span></footer>
      </main>
    </div>
    <input ref={fileInput} type="file" accept="application/pdf,.pdf" multiple hidden onChange={event => event.target.files && void importFiles(event.target.files)} aria-label="Import PDF files" />
    <button className="floating-import" inert={!!readerBook} aria-label="Import a PDF" onClick={() => fileInput.current?.click()} disabled={!!importing}>{importing ? <LoaderCircle className="spin" size={25} /> : <Plus size={27} />}</button>
    <Sheet open={mobileNav} onOpenChange={setMobileNav} title="Your reading room"><div className="mobile-navigation">{nav}</div></Sheet>
    <Sheet open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }} title={panel === "settings" ? "Make yourself at home" : panel === "new-collection" ? "A new shelf for your stories" : panel === "rename" ? "Give your book a name" : panel === "collections" ? "Add to a collection" : panel === "remove" ? "Make a little room?" : panel === "details" ? "About this book" : selected?.title || "Your book"} description={panel === "settings" ? "A few little things to make Folio feel like you." : panel === "new-collection" ? "Bring books together, however you like." : undefined}>
      {panel === "settings" && <div className="settings-content"><div className="setting-label">YOUR READING ROOM</div><div className="theme-options">{[{ id: "light", label: "Light", Icon: Sun }, { id: "dark", label: "Dark", Icon: Moon }, { id: "sepia", label: "Sepia", Icon: BookOpen }].map(({ id, label, Icon }) => <button key={id} className={`theme-option theme-${id} ${theme === id ? "selected" : ""}`} onClick={() => setAppearance(id)} aria-pressed={theme === id}><Icon size={23} /><span>{label}</span>{theme === id && <Check size={14} />}</button>)}</div><div className="settings-storage"><ShieldCheck size={23} /><div><strong>Private by nature.</strong><p>{books.length} books · {fileSize(totalSize)} stored on this device.<br />Your PDFs never leave your browser. Clearing browser data removes your local library.</p></div></div><div className="offline-status"><WifiOff size={18} /><span>{offlineReady ? "Your reading room is ready to go offline." : process.env.NODE_ENV !== "production" ? "Offline reading is enabled in the production build." : "Preparing the app for offline reading…"}</span></div>{!installed && <div className="install-card"><Download size={22} /><h3>A home on your home screen.</h3><p>{installPrompt ? "Keep your entire reading room one tap away." : "In Chrome on Android, open the browser menu and choose “Add to home screen” → “Install”."}</p>{installPrompt && <Button onClick={() => void install()}><Plus size={16} />Install Folio</Button>}</div>}<div className="settings-version">Folio 1.0 · Made for the love of reading</div></div>}
      {selected && panel === "menu" && <><div className="sheet-book-summary"><BookCover book={selected} /><div><strong>{selected.title}</strong><p>{selected.author}</p><small>{selected.totalPages} pages · {fileSize(selected.size)}</small></div></div><div className="action-list"><button onClick={() => openBook(selected)}><BookOpen size={19} />Open book<ArrowRight size={17} /></button><button onClick={() => favorite(selected)}><Heart size={19} fill={selected.favorite ? "currentColor" : "none"} />{selected.favorite ? "Remove from favorites" : "Add to favorites"}</button><button onClick={() => { setFormValue(selected.title); setPanel("rename"); }}><Pencil size={19} />Rename</button><button onClick={() => setPanel("collections")}><Folder size={19} />Add to collection</button><button onClick={() => setPanel("details")}><Info size={19} />Book information</button><button className="danger" onClick={() => setPanel("remove")}><Trash2 size={19} />Remove from library</button></div></>}
      {selected && panel === "details" && <><div className="details-cover"><BookCover book={selected} /></div><h3 className="details-title">{selected.title}</h3><p className="details-author">{selected.author}{selected.sample && " · Original reading sample"}</p><dl className="book-details">{[["Filename", selected.filename], ["Pages", String(selected.totalPages)], ["File size", fileSize(selected.size)], ["Added", new Date(selected.dateAdded).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })], ["Last read", selected.lastOpened ? new Date(selected.lastOpened).toLocaleDateString() : "A new story awaits"], ["Progress", `${selected.progress}% · Page ${selected.currentPage} of ${selected.totalPages}`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="details-actions"><Button onClick={() => openBook(selected)}><BookOpen size={17} />Read book</Button><Button variant="outline" size="icon" aria-label="Toggle favorite" onClick={() => favorite(selected)}><Heart size={18} fill={selected.favorite ? "currentColor" : "none"} /></Button><Button variant="outline" size="icon" aria-label="Rename book" onClick={() => { setFormValue(selected.title); setPanel("rename"); }}><Pencil size={17} /></Button><Button variant="outline" size="icon" aria-label="Remove book" onClick={() => setPanel("remove")}><Trash2 size={17} /></Button></div></>}
      {(panel === "rename" || panel === "new-collection") && <form className="name-form" onSubmit={event => { event.preventDefault(); const value = formValue.trim(); if (!value) return; void perform(async () => { if (panel === "rename" && selected) await db.books.update(selected.id, { title: value }); else { if (collections.some(c => c.name.toLocaleLowerCase() === value.toLocaleLowerCase())) throw new Error("A collection with that name already exists."); await db.collections.add({ id: crypto.randomUUID(), name: value, createdAt: Date.now() }); } setPanel(null); }, panel === "rename" ? "A fresh name for a good read." : "Your new collection is ready."); }}><label htmlFor="name-input">{panel === "rename" ? "Book title" : "Collection name"}</label><input id="name-input" autoFocus value={formValue} maxLength={120} onChange={event => setFormValue(event.target.value)} placeholder="Something worth keeping…" required /><Button type="submit" disabled={!formValue.trim() || busy}>{panel === "rename" ? "Save name" : "Create collection"}<ArrowRight size={16} /></Button></form>}
      {selected && panel === "collections" && <div className="collection-picker">{collections.map(collection => <button key={collection.id} disabled={busy} onClick={() => void perform(() => db.books.update(selected.id, { collectionIds: selected.collectionIds.includes(collection.id) ? selected.collectionIds.filter(id => id !== collection.id) : [...selected.collectionIds, collection.id] }))}><Folder size={19} /><span>{collection.name}</span><span className={`checkbox ${selected.collectionIds.includes(collection.id) ? "checked" : ""}`}>{selected.collectionIds.includes(collection.id) && <Check size={15} />}</span></button>)}<Button variant="outline" onClick={() => { setFormValue(""); setPanel("new-collection"); }}><Plus size={17} />Create a collection</Button><Button onClick={() => setPanel(null)}>All done<Check size={17} /></Button></div>}
      {selected && panel === "remove" && <div className="remove-content"><p>Remove <strong>{selected.title}</strong> from Folio? Its saved place and bookmarks will also be removed. Your original file stays wherever you saved it.</p><Button variant="destructive" disabled={busy} onClick={() => void perform(async () => { await removeBook(selected.id); setPanel(null); }, "Book removed from your library.")}><Trash2 size={17} />Remove book</Button><Button variant="outline" onClick={() => setPanel(null)}>Keep it on the shelf</Button></div>}
    </Sheet>
    <AnimatePresence>{toast && <motion.div className={`toast ${toast.error ? "toast-error" : ""}`} role={toast.error ? "alert" : "status"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>{toast.error ? <Info size={18} /> : <CheckCircle2 size={18} />}<span>{toast.text}</span><button aria-label="Dismiss notification" onClick={() => setToast(undefined)}><X size={16} /></button></motion.div>}</AnimatePresence>
    {importing && <div className="import-status" role="status"><LoaderCircle className="spin" size={18} /><div><strong>Finding a place on your shelf…</strong><span>{importing}</span></div><LockKeyhole size={15} /></div>}
    {dragging && <div className="drop-overlay" onDragLeave={() => setDragging(false)}><Upload size={45} /><h2>Let your next chapter land here.</h2><p>Drop your PDFs to add them to Folio.</p></div>}
    {readerBook && <Reader key={readerBook.id} book={readerBook} theme={theme} onThemeChange={setAppearance} onClose={closeReader} onError={message => notify(message, true)} />}
  </div>;
}
