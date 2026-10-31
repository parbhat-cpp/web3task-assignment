import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Invite from "./pages/Invite";
import { useEffect } from "react";
import { preloadWordList } from "./services/wordlist";

function App() {
  useEffect(() => {
    preloadWordList().catch((error: unknown) => {
      console.error("Unable to preload word list", error);
    });
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/invite/:roomId" element={<Invite />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default App;
