"use client";

import { FileText } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-paper">
      <div className="text-center text-pencil/40">
        <FileText size={48} strokeWidth={1.5} className="mx-auto mb-4 md:size-16" />
        <p className="text-xl font-bold md:text-2xl" style={{ fontFamily: "var(--font-heading)" }}>
          Welcome to oh-note
        </p>
        <p className="mt-2 text-base md:text-lg">Select a folder and note to start writing</p>
      </div>
    </div>
  );
}
