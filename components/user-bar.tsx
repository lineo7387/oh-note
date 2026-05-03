"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";

interface UserBarProps {
  email: string;
}

export default function UserBar({ email }: UserBarProps) {
  const [expanded, setExpanded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = () => {
    setLoggingOut(true);
    signOut({ callbackUrl: "/login" });
  };

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="relative border-t-2 border-dashed border-pencil/20">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-pencil/5"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center border-2 border-pencil bg-white text-sm font-bold text-pencil shadow-sketch wobbly-sm">
          {initial}
        </div>
        <span className="min-w-0 flex-1 truncate text-sm text-pencil">
          {email}
        </span>
      </button>

      {expanded && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setExpanded(false)}
          />
          <div className="absolute bottom-full left-2 right-2 z-20 mb-1 border-2 border-pencil bg-white py-1 shadow-sketch wobbly-sm">
            <button
              onClick={handleSignOut}
              disabled={loggingOut}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-accent hover:bg-accent/5 disabled:opacity-50"
            >
              {loggingOut ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-pencil/30 border-t-accent" />
              ) : (
                <LogOut size={14} strokeWidth={2.5} />
              )}
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
