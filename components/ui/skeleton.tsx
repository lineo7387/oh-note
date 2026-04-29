"use client";

export function SkeletonLine({ width = "100%", height = "1rem", className = "" }: { width?: string; height?: string; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonFolder({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2 px-3 py-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2"
        >
          <SkeletonLine width="16px" height="16px" />
          <SkeletonLine width={`${60 + Math.random() * 30}%`} height="0.875rem" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonNote({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2 px-3 py-3"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2"
        >
          <SkeletonLine width="16px" height="16px" />
          <SkeletonLine width={`${50 + Math.random() * 40}%`} height="0.875rem" />
        </div>
      ))}
    </div>
  );
}
