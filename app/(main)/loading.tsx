import { SkeletonFolder, SkeletonNote } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      {/* Left column skeleton */}
      <aside className="flex h-full w-[280px] shrink-0 flex-col border-r-2 border-pencil bg-paper">
        <div className="flex items-center justify-between px-3 py-3">
          <div className="h-6 w-20 animate-pulse rounded bg-pencil/20" />
          <div className="h-8 w-8 animate-pulse rounded bg-pencil/20" />
        </div>
        <div className="flex-1 overflow-hidden border-b-2 border-dashed border-pencil/20">
          <SkeletonFolder count={8} />
        </div>
        <div className="h-[40%] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="h-6 w-16 animate-pulse rounded bg-pencil/20" />
            <div className="h-8 w-8 animate-pulse rounded bg-pencil/20" />
          </div>
          <SkeletonNote count={6} />
        </div>
      </aside>

      {/* Center editor skeleton */}
      <main className="flex flex-1 flex-col overflow-hidden bg-paper">
        <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-6 py-4">
          <div className="h-8 w-48 animate-pulse rounded bg-pencil/20" />
        </div>
        <div className="flex-1 overflow-auto px-6 py-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="h-4 w-full animate-pulse rounded bg-pencil/10" />
            <div className="h-4 w-[90%] animate-pulse rounded bg-pencil/10" />
            <div className="h-4 w-[95%] animate-pulse rounded bg-pencil/10" />
            <div className="h-4 w-[80%] animate-pulse rounded bg-pencil/10" />
            <div className="h-32 w-full animate-pulse rounded bg-pencil/10" />
          </div>
        </div>
      </main>
    </div>
  );
}
