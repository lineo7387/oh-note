"use client";

import { FileText } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="text-center text-pencil/40">
        <FileText size={64} strokeWidth={1.5} className="mx-auto mb-4" />
        <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
          Welcome to oh-note
        </p>
        <p className="mt-2 text-lg">Select a folder and note to start writing</p>
      </div>
    </div>
  );
}
