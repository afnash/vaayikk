import Dexie, { type Table } from "dexie";
export interface Book {
  id: string; title: string; filename: string; author: string; pdfBlob: Blob; coverBlob: Blob;
  totalPages: number; currentPage: number; progress: number; favorite: boolean; dateAdded: number;
  lastOpened: number; collectionIds: string[]; size: number; color: string; sample?: boolean;
}
export interface Bookmark { id: string; bookId: string; pageNumber: number; createdAt: number }
export interface Collection { id: string; name: string; createdAt: number }
class FolioDatabase extends Dexie {
  books!: Table<Book, string>;
  bookmarks!: Table<Bookmark, string>;
  collections!: Table<Collection, string>;
  preferences!: Table<{ key: string; value: string }, string>;
  constructor() { super("folio-library"); this.version(1).stores({ books: "id, title, dateAdded, lastOpened, *collectionIds", bookmarks: "id, bookId, [bookId+pageNumber]", collections: "id, name", preferences: "key" }); }
}
export const db = new FolioDatabase();
let initialization: Promise<void> | undefined;
export function initializeLibrary() {
  return initialization ??= (async () => {
    if (await db.preferences.get("initialized")) return;
    const response = await fetch("/demo/catalog.json");
    if (!response.ok) throw new Error("Could not load your starter library. Please reload to try again.");
    const catalog: { id: string; title: string; color: string; collection: string }[] = await response.json();
    const now = Date.now();
    const books = await Promise.all(catalog.map(async (item, index): Promise<Book> => {
      const [pdf, cover] = await Promise.all([fetch(`/demo/${item.id}.pdf`), fetch(`/demo/${item.id}.png`)]);
      if (!pdf.ok || !cover.ok) throw new Error("A sample book could not be loaded. Please reload to try again.");
      const pdfBlob = await pdf.blob();
      return { id: item.id, title: item.title, author: "Folio Editions", filename: `${item.id}.pdf`, pdfBlob, coverBlob: await cover.blob(), size: pdfBlob.size, color: item.color, totalPages: 7, currentPage: 1, progress: 0, favorite: false, dateAdded: now - index * 1000, lastOpened: 0, collectionIds: [item.collection], sample: true };
    }));
    await db.transaction("rw", db.books, db.collections, db.preferences, async () => {
      // Recheck inside the transaction so multiple tabs cannot reset a library.
      if (await db.preferences.get("initialized")) return;
      await db.collections.bulkPut([{ id: "everyday", name: "Everyday inspiration", createdAt: now }, { id: "creative", name: "Creative minds", createdAt: now + 1 }, { id: "fiction", name: "A little escape", createdAt: now + 2 }]);
      await db.books.bulkPut(books);
      await db.preferences.put({ key: "initialized", value: "true" });
    });
  })().catch(error => { initialization = undefined; throw error; });
}
export async function saveProgress(bookId: string, page: number, total: number) {
  await db.books.update(bookId, { currentPage: page, totalPages: total, progress: Math.round(page / total * 100), lastOpened: Date.now() });
}
export async function removeBook(id: string) {
  await db.transaction("rw", db.books, db.bookmarks, async () => { await db.bookmarks.where("bookId").equals(id).delete(); await db.books.delete(id); });
}
export async function toggleBookmark(bookId: string, pageNumber: number) {
  await db.transaction("rw", db.bookmarks, async () => {
    const existing = await db.bookmarks.where("[bookId+pageNumber]").equals([bookId, pageNumber]).first();
    if (existing) await db.bookmarks.delete(existing.id);
    else await db.bookmarks.add({ id: crypto.randomUUID(), bookId, pageNumber, createdAt: Date.now() });
  });
}
