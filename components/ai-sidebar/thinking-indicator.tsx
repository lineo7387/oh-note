"use client";

import { Bot, Loader2 } from "lucide-react";

export default function ThinkingIndicator() {
  return (
    <div className="mb-3 flex gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-pencil bg-white text-pencil wobbly-sm">
        <Bot size={14} strokeWidth={2.5} />
      </div>
      <div className="flex max-w-[85%] flex-col gap-1">
        <div className="border-2 border-pencil bg-white px-3 py-2 text-sm text-pencil shadow-sketch-subtle wobbly-sm">
          <span className="inline-flex items-center gap-1.5">
            <Loader2 size={14} className="animate-spin text-pen-blue" />
            <span className="text-pencil/60">Thinking…</span>
          </span>
        </div>
      </div>
    </div>
  );
}
