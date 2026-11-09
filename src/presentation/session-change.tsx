"use client";

import { useEffect } from "react";

const key = "sapporo-auth-change";

export function announceSessionChange() {
  try {
    window.localStorage.setItem(key, crypto.randomUUID());
  } catch {
    // Private browsing may disable storage. The current tab still navigates.
  }
}

export function SessionChangeListener() {
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === key) window.location.reload();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) window.location.reload();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
