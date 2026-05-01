"use client";

import { useState, useCallback } from "react";

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (action: () => Promise<void>) => {
    if (loading) return;
    setLoading(true);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return { loading, run };
}
