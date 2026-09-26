"use client";
import { useObjectUrl } from "@/hooks/use-object-url";
import type { Book } from "@/lib/db";
import { BookOpen } from "lucide-react";
export function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  const url = useObjectUrl(book.coverBlob);
  return <div className={`book-cover ${className}`} style={{ backgroundColor: book.color }}>{url ? <img src={url} alt={`${book.title} cover`} draggable={false} /> : <BookOpen size={36} />}</div>;
}
