import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import { router } from "./router";
import { GameProvider } from "./lib/store";
import { SyncProvider } from "./lib/sync";
import { GameSync } from "./components/GameSync";
import { Toaster } from "@/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GameProvider>
      <SyncProvider>
        <GameSync />
        <RouterProvider router={router} />
        <Toaster position="top-center" />
      </SyncProvider>
    </GameProvider>
  </StrictMode>,
);
