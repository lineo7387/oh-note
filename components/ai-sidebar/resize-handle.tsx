"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ResizeHandleProps {
  onResize: (width: number) => void;
}

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = (e.currentTarget.parentElement?.clientWidth ?? 320);
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(
        Math.max(startWidthRef.current + delta, 280),
        720
      );
      onResize(newWidth);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute left-0 top-0 z-10 h-full w-[8px] -translate-x-1/2 cursor-ew-resize"
      style={{ touchAction: "none" }}
    >
      <div
        className={`mx-auto h-full w-[4px] transition-colors ${
          dragging ? "bg-pen-blue" : "bg-transparent hover:bg-pencil/20"
        }`}
      />
    </div>
  );
}
