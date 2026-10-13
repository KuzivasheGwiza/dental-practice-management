import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { brand } from "./config";
document.documentElement.style.setProperty("--navy", brand.navy);
document.documentElement.style.setProperty("--teal", brand.teal);
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
