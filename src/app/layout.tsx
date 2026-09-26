import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Folio — A little space for your next chapter", description: "Your books. Your space. A beautiful, private PDF library and reader that lives entirely on your device.", manifest: "/manifest.json", appleWebApp: { capable: true, statusBarStyle: "default", title: "Folio" }, icons: { icon: "/icon.svg", apple: "/icons/icon-192.png" } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f8f7f3" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><body>{children}</body></html>; }
