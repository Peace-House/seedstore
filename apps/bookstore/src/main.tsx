import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initClarity } from "./lib/clarity";

// Microsoft Clarity (session replay + heatmaps). No-op unless
// VITE_CLARITY_PROJECT_ID is set, so dev and preview builds stay out of
// the production data. See src/lib/clarity.ts for the privacy notes.
initClarity();

createRoot(document.getElementById("root")!).render(<App />);
