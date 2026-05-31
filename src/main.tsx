import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA install prompt (Chrome/Android requires it).
// Guard: never register inside the Lovable editor iframe / preview hosts.
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") || host.includes("lovableproject.com");

  if (isInIframe || isPreviewHost) {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      regs.forEach((r) => r.unregister())
    );
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
}
