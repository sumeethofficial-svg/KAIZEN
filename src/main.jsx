import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";

import App from "./App.jsx";
import "./index.css";

import { startKaizenOpeningSlash } from "./components/KaizenOpeningSlash.jsx";

startKaizenOpeningSlash();

createRoot(
  document.getElementById("root")
).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>
);