"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ConversationMeta } from "@/lib/conversations-db";

interface ConversationTabsProps {
  conversations: ConversationMeta[];
  activeId: string | undefined;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export default function ConversationTabs({
  conversations,
  activeId,
  onSwitch,
  onCreate,
  onDelete,
}: ConversationTabsProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-dashed border-pencil/20 px-2 py-2">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onSwitch(c.id)}
          onMouseEnter={() => setHoveredId(c.id)}
          onMouseLeave={() => setHoveredId(null)}
          title={c.title || "Untitled"}
          className={`group flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-xs transition-colors ${
            c.id === activeId
              ? "border-pen-blue bg-pen-blue/10 font-bold text-pen-blue"
              : "border-pencil/20 bg-white text-pencil/60 hover:border-pencil/40 hover:text-pencil"
          }`}
        >
          <span className="max-w-[80px] truncate">
            {c.title || "Untitled"}
          </span>
          {conversations.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              className={`ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded text-pencil/40 hover:bg-accent/10 hover:text-accent ${
                hoveredId === c.id || c.id !== activeId ? "opacity-100" : "opacity-0"
              }`}
            >
              <X size={10} strokeWidth={2.5} />
            </span>
          )}
        </button>
      ))}
      <button
        onClick={onCreate}
        className="flex shrink-0 items-center justify-center rounded border border-pencil/20 bg-white p-1 text-pencil/60 hover:border-pen-blue hover:text-pen-blue"
        title="New conversation"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
