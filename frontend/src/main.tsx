import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import SocketProvider from "../hooks/useSocket.tsx";
import { Toaster } from "react-hot-toast";
import { SOCKET_URL } from "./config";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SocketProvider
        config={{
          room: {
            url: SOCKET_URL + "/room",
          },
        }}
      >
        <App />
      </SocketProvider>
      <Toaster />
    </BrowserRouter>
  </StrictMode>,
);
