"use client";
import { BookOpen, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="app-error"><BookOpen size={39} strokeWidth={1.4} /><h1>Your reading room needs a moment.</h1><p>Folio couldn’t open its local library. Try again, and make sure this browser allows site storage.</p><Button onClick={reset}><RotateCcw size={16} />Try again</Button></main>;
}
