"use client";

import { useEffect } from "react";

// Registers the service worker once the page has loaded.
// The worker only enables home-screen install.
export default function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.error("sw register failed", err);
    });
  }, []);
  return null;
}
