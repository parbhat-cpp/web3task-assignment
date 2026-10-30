import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useSocket } from "../../hooks/useSocket";
import { useAtom } from "jotai";
import { roomAtom } from "../store/room.store";
import "../App.css";

const Invite = () => {
  const { roomId = "unknown" } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const socket = useSocket("room");
  const [, setRoom] = useAtom(roomAtom);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (!roomId) {
      navigate("/");
    }

    if (!socket) return;

    socket.on("room_joined", (data) => {
      setRoom(data.roomData);
      navigate(`/room/${data.roomId}`);
    });
    socket.on("room_join_failed", () => {
      toast.error("Unable to join room");
    });
    socket.on("room_not_found", () => {
      toast.error("Room not found");
    });

    return () => {
      socket.off("room_joined");
      socket.off("room_join_failed");
      socket.off("room_not_found");
    };
  }, [socket, roomId, navigate, setRoom]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUserName = userName.trim();
    if (!socket || !roomId || roomId === "unknown" || !trimmedUserName) {
      return;
    }

    socket.emit("join_room", {
      roomId,
      userName: trimmedUserName,
    });
  };

  return (
    <main className="app-shell">
      <section className="form-card" aria-labelledby="invite-title">
        <div className="eyebrow">Sketch room</div>
        <h1 id="invite-title">Accept room invite</h1>
        <p className="intro">
          Choose a username to join room <code>{roomId}</code>.
        </p>
        <form onSubmit={handleSubmit}>
          <label className="field" htmlFor="invite-username">
            <span>Username</span>
            <input
              id="invite-username"
              type="text"
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Enter your username"
              maxLength={14}
              required
              autoFocus
            />
          </label>
          <button type="submit">Accept room invite</button>
        </form>
      </section>
    </main>
  );
};

export default Invite;
