import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@cloudscape-design/global-styles/index.css";
import { App } from "./App";
import { connectToFrank } from "./mcp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App frank={connectToFrank()} />
  </StrictMode>,
);
