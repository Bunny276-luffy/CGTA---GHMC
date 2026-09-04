"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available; automatically activate
                  console.info("CivicTrust update detected. Refreshing assets.");
                }
              };
            }
          };
        })
        .catch((err) => {
          console.debug("Service Worker registration skipped:", err);
        });
    }
  }, []);

  return null;
}
