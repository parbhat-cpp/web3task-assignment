import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import SocketProvider from "../hooks/useSocket.tsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SocketProvider
        config={{
          room: {
            url: "http://localhost:5000/room",
          },
        }}
      >
        <App />
      </SocketProvider>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
