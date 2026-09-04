"use client";

import { useEffect } from "react";

// Registers the service worker once the page has loaded.
// Phase 0: the worker does nothing yet. Phase 9 adds push; Phase 11 adds offline.
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("sw register failed", err);
    });
  }, []);
  return null;
}
