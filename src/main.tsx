  import { createRoot } from "react-dom/client";
  import { HelmetProvider } from "react-helmet-async";
  import App from "./app/App.tsx";
  /* Self-hosted: IBM Plex Sans Arabic only (400, 600; arabic subset). Inter removed — not used in app; IBM Plex covers Latin. */
  import "@fontsource/ibm-plex-sans-arabic/arabic-400.css";
  import "@fontsource/ibm-plex-sans-arabic/arabic-600.css";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(<HelmetProvider><App /></HelmetProvider>);
  