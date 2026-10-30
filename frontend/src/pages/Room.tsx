import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Room.css";
import { roomAtom } from "../store/room.store";
import { useAtom } from "jotai/react";
import { useSocket } from "../../hooks/useSocket";
import toast from "react-hot-toast";
import { MdGroupRemove } from "react-icons/md";
import { IoExit } from "react-icons/io5";

type Member = {
  id: string;
  name: string;
  isHost?: boolean;
  isDrawing?: boolean;
};

type Message = {
  id: string;
  name: string;
  text: string;
};

function Room() {
  const socket = useSocket("room");
  const navigate = useNavigate();

  const [room, setRoom] = useAtom(roomAtom);

  const { roomId = "unknown" } = useParams();
  const [messages, setMessages] = useState([] as Message[]);
  const [message, setMessage] = useState("");
  const [userId] = useState(localStorage.getItem("userId") ?? "");

  const username = useMemo(() => {
    return room?.members.find((m) => m.userId === userId)?.userName ?? "";
  }, []);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;
    if (!socket) return;

    socket.emit("send_chat", {
      roomId: room?.roomId,
      userId,
      userName: username,
      message: text,
    });

    setMessages((current) => [...current, { id: userId, name: "You", text }]);
    setMessage("");
  };

  useEffect(() => {
    if (!socket) return;

    socket.on("room_member_joined", (data) => {
      toast.success(`${data.userName} joined the room`);
      setRoom(data.roomData);
    });

    socket.on("not_authorized", () => {
      toast.error("You are not authorized to remove this member");
    });
    socket.on("member_not_found", () => {
      toast.error("Member not found");
    });
    socket.on("room_not_found", () => {
      toast.error("Room not found");
    });
    socket.on("room_member_removed", (data) => {
      toast.success(`${data.removedUsername} was removed from the room`);
      setRoom(data.roomData);
    });
    socket.on("leave_room", () => {
      navigate("/");
      toast.success(`You have been removed from the room`);
      setRoom(null);
    });
    socket.on("member_left", (data) => {
      toast.success(`${data.memberName} has left the room`);
      setRoom(data.roomData);
    });
    socket.on("receive_chat", (data) => {
      setMessages((current) => [
        ...current,
        {
          id: data.userId,
          name: data.userName,
          text: data.message,
        },
      ]);
    });

    return () => {
      socket.off("room_member_joined");
      socket.off("not_authorized");
      socket.off("member_not_found");
      socket.off("room_not_found");
      socket.off("room_member_removed");
      socket.off("leave_room");
      socket.off("member_left");
      socket.off("receive_chat");
    };
  }, [socket]);

  const handleRemoveMember = (userId: string) => {
    if (!socket) return;
    socket.emit("remove_member", {
      roomId: room?.roomId,
      reqUserId: localStorage.getItem("userId"),
      userId,
    });
  };

  const handleLeaveRoom = () => {
    if (!socket) return;
    socket.emit("leave_room", {
      roomId: room?.roomId,
      userId: localStorage.getItem("userId"),
    });
    setRoom(null);
    navigate("/");
  };

  return (
    <main className="room-shell">
      <header className="room-header">
        <div>
          <h2>
            Room <span className="room-code">{room?.roomId}</span>
          </h2>
        </div>
        <div className="round-status">
          <span onClick={handleLeaveRoom}>
            <IoExit />
          </span>
          <span className="status-dot" aria-hidden="true" />
          <span>Round 1 of 3</span>
          <strong>01:00</strong>
        </div>
      </header>

      <section className="room-grid" aria-label="Game room">
        <aside
          className="room-panel members-panel"
          aria-labelledby="members-title"
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Players</span>
              <h2 id="members-title">Queue</h2>
            </div>
            <span className="member-count">
              {room?.members.length}/{room?.config.maxPlayers}
            </span>
          </div>
          <ol className="member-list">
            {room?.members.map((member, index) => (
              <li
                className={member ? "member is-drawing" : "member"}
                key={member.userId}
              >
                <span className="member-number">0{index + 1}</span>
                <span className="member-avatar">
                  {member.userName.charAt(0)}
                </span>
                <span className="member-details">
                  <strong>{member.userName}</strong>
                  <span>
                    {member.isHost && <small>Host</small>}
                    {userId === member.userId && <small>(You)</small>}
                  </span>
                  {/* {member.isDrawing && (
                    <small className="drawing-label">Drawing now</small>
                    )} */}
                </span>
                <span>
                  {userId === room?.members[0].userId &&
                    userId !== member.userId && (
                      <span onClick={() => handleRemoveMember(member.userId)}>
                        <MdGroupRemove />
                      </span>
                    )}
                </span>
                {/* {member.isDrawing && (
                  <span className="turn-indicator" aria-label="Current turn">
                    ●
                  </span>
                )} */}
              </li>
            ))}
          </ol>
          <div className="room-tip">
            <span aria-hidden="true">✦</span>
            <p>Keep guesses in the chat. The artist cannot see the answer.</p>
          </div>
        </aside>

        <section className="canvas-panel" aria-label="Drawing canvas">
          <div className="canvas-toolbar">
            <span className="canvas-label">Maya is drawing</span>
            <button
              type="button"
              className="toolbar-button"
              aria-label="Clear canvas"
            >
              Clear
            </button>
          </div>
          <div className="canvas-wrap">
            <canvas className="drawing-canvas" aria-label="Drawing board" />
            <div className="canvas-empty-state">
              <span className="canvas-crosshair" aria-hidden="true">
                +
              </span>
              <p>Canvas ready</p>
              <small>Take your best guess in the chat</small>
            </div>
          </div>
          <div className="canvas-tools" aria-label="Drawing tools">
            <button
              type="button"
              className="tool-button active"
              aria-label="Pen"
            >
              ●
            </button>
            <button type="button" className="tool-button" aria-label="Eraser">
              ⌫
            </button>
            <span className="tool-divider" />
            <span className="color-swatch" aria-label="Current color" />
          </div>
        </section>

        <aside className="room-panel chat-panel" aria-labelledby="chat-title">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Room conversation</span>
              <h2 id="chat-title">Chat</h2>
            </div>
            <span className="online-label">
              <span className="status-dot" /> Live
            </span>
          </div>
          <div className="message-list" aria-live="polite">
            {messages.map((item) => (
              <article
                className={
                  item.name === "You" ? "message own-message" : "message"
                }
                key={item.id}
              >
                <strong>{item.name}</strong>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <label htmlFor="chat-message" className="sr-only">
              Message
            </label>
            <input
              id="chat-message"
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type a guess..."
              maxLength={120}
            />
            <button type="submit" aria-label="Send message">
              →
            </button>
          </form>
        </aside>
      </section>
    </main>
  );
}

export default Room;
