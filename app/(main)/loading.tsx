import { SkeletonLine } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-full w-full flex-col bg-paper">
      {/* Mobile header skeleton */}
      <div className="flex items-center justify-between border-b-2 border-pencil bg-paper px-3 py-2 md:hidden">
        <div className="h-10 w-10 animate-pulse rounded bg-pencil/20" />
        <div className="h-6 w-20 animate-pulse rounded bg-pencil/20" />
        <div className="w-10" />
      </div>

      {/* Editor header skeleton */}
      <div className="flex items-center justify-between border-b-2 border-dashed border-pencil/20 px-6 py-4">
        <div className="h-8 w-48 animate-pulse rounded bg-pencil/20" />
      </div>

      {/* Editor body skeleton */}
      <div className="flex-1 overflow-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-4 w-full animate-pulse rounded bg-pencil/10" />
          <div className="h-4 w-[90%] animate-pulse rounded bg-pencil/10" />
          <div className="h-4 w-[95%] animate-pulse rounded bg-pencil/10" />
          <div className="h-4 w-[80%] animate-pulse rounded bg-pencil/10" />
          <div className="h-32 w-full animate-pulse rounded bg-pencil/10" />
        </div>
      </div>
    </div>
  );
}
