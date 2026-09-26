"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "./button";
export function Sheet({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: React.ReactNode }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="sheet-overlay" /><Dialog.Content className="sheet-content" aria-describedby={description ? "sheet-description" : undefined}><div className="sheet-handle" /><div className="sheet-heading"><Dialog.Title>{title}</Dialog.Title><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close panel"><X size={20} /></Button></Dialog.Close></div>{description && <Dialog.Description id="sheet-description" className="sheet-description">{description}</Dialog.Description>}{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
