import "./App.css";
import { Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Room from "./pages/Room";
import Invite from "./pages/Invite";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/invite/:roomId" element={<Invite />} />
      <Route path="/room/:roomId" element={<Room />} />
    </Routes>
  );
}

export default App;
