# 📚 Vaayikk

**Your PDFs. Your library. Your device.**

Vaayikk is an Android-first, local-first Progressive Web App that turns locally stored PDF files into a clean, book-like reading experience.

Instead of treating PDFs like documents that need to be continuously scrolled, vaayikk presents them like real ebooks — with page-by-page navigation, a personal bookshelf, reading progress, bookmarks, collections, and offline access.

---

## ✨ Features

### 📖 Book-like PDF Reader

- Single-page reading experience
- Swipe left/right to turn pages
- Tap page edges for navigation
- Pinch-to-zoom
- Immersive fullscreen reading
- Jump to any page using the progress slider
- Light, dark, and sepia reading modes

### 📚 Personal Library

Import PDFs directly from your device and organize them into a visual bookshelf.

- Automatic cover generation from the first page
- Grid and list views
- Recently added books
- Continue reading
- Favorites
- Custom collections
- Reading / Finished filters
- Library search

### 🔖 Bookmarks

Save important pages while reading.

Bookmarks are stored locally and can be reopened instantly from the book's bookmark panel.

### 📊 Reading Progress

vaayikk automatically remembers:

- Current page
- Total pages
- Reading percentage
- Last opened time
- Finished books

Close the app and return later — vaayikk opens exactly where you stopped.

### 📴 Offline First

vaayikk is designed to work without an internet connection.

Once installed and the required resources are cached, your library remains available offline.

No server is required for reading.

### 🔐 Privacy First

Your books belong to you.

vaayikk does not require:

- Accounts
- Authentication
- Cloud uploads
- Remote PDF processing

PDFs, bookmarks, collections, and reading progress remain on your device.

---

## 🛠 Tech Stack

- **Next.js**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **PDF.js**
- **Dexie.js**
- **IndexedDB**
- **Framer Motion**
- **Progressive Web App APIs**

---

## 🗂 Local Data

vaayikk stores application data locally using IndexedDB.

### Books

```text
id
title
filename
pdfBlob
coverBlob
totalPages
currentPage
progress
favorite
dateAdded
lastOpened
collectionIds
```

### Bookmarks

```text
id
bookId
pageNumber
createdAt
```

### Collections

```text
id
name
createdAt
```

Future versions may use OPFS or supported filesystem APIs for improved handling of very large PDF libraries.

---

## 📱 Android PWA

vaayikk is primarily designed for Android devices.

It can be installed directly from a supported browser and launched in standalone mode, providing an app-like experience without browser navigation controls.

The UI is optimized primarily for **360–480px mobile displays** while remaining responsive on tablets and desktop devices.

---

## 🧭 Basic Flow

```text
Import PDF
     ↓
Generate Cover
     ↓
Add to Library
     ↓
Open Book
     ↓
Swipe / Turn Pages
     ↓
Bookmark + Track Progress
     ↓
Close App
     ↓
Resume From Last Page
```

---

## 🚀 Getting Started

Clone the repository:

```bash
git clone <repository-url>
cd vaayikk
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

For testing on an Android device, run the development server on your local network and access it from the phone, or deploy the PWA over HTTPS.

---

## 🧪 Development & Testing

The project can be developed alongside:

- **Playwright** — mobile viewport and end-to-end testing
- **Chrome DevTools** — PWA, IndexedDB, service worker and performance debugging
- **Context7** — current framework/library documentation
- **GitHub** — source control and development workflow

Important test flows include:

```text
Import PDF
→ Verify cover
→ Open book
→ Navigate pages
→ Bookmark page
→ Close reader
→ Reopen book
→ Verify reading position
→ Verify bookmark
→ Enable offline mode
→ Verify book remains readable
```

---

## 🗺 Roadmap

### V1 — Core Reader

- [ ] Local PDF import
- [ ] Automatic book covers
- [ ] Bookshelf
- [ ] Paged PDF reader
- [ ] Swipe navigation
- [ ] Pinch-to-zoom
- [ ] Reading progress
- [ ] Bookmarks
- [ ] Favorites
- [ ] Collections
- [ ] Search library
- [ ] Dark mode
- [ ] Sepia mode
- [ ] Offline PWA
- [ ] Android installation

### V2 — Better Reading

- [ ] Highlights
- [ ] Notes
- [ ] PDF text search
- [ ] Two-page tablet mode
- [ ] Reading statistics
- [ ] Reading goals
- [ ] Improved page-turn animations
- [ ] OPFS storage
- [ ] Export/import library metadata

### V3 — Smart Library

Potential optional AI features:

- [ ] Ask this book
- [ ] Explain selected text
- [ ] Chapter summaries
- [ ] Semantic book search
- [ ] Search across the entire library
- [ ] Generate flashcards
- [ ] Generate quizzes
- [ ] Local/remote RAG support

AI functionality should remain optional and separate from the core offline reading experience.

---

## 🎯 Project Philosophy

vaayikk should feel like a **bookshelf, not a file manager**.

The reader should disappear while you're reading.

The application should remain:

**Fast. Minimal. Offline. Private. Book-first.**

---

## 📄 License

This project is currently being developed as a personal/open-source experimental project.

License information will be added before the first public release.

---

<p align="center">
  <strong>vaayikk</strong><br>
  Turn your PDF folder into a library.
</p>