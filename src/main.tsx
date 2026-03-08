import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initTheme } from "./lib/themePresets";

// Apply saved theme on boot
initTheme();

createRoot(document.getElementById("root")!).render(<App />);
