import { useState } from "react";
import type { FormEvent } from "react";
import { useParams } from "react-router-dom";
import "./Room.css";
import { roomAtom } from "../store/room.store";
import { useAtom } from "jotai/react";

type Member = {
  id: string;
  name: string;
  isHost?: boolean;
  isDrawing?: boolean;
};

type Message = {
  id: number;
  name: string;
  text: string;
};

function Room() {
  const [room] = useAtom(roomAtom);

  const { roomId = "unknown" } = useParams();
  const [messages, setMessages] = useState([] as Message[]);
  const [message, setMessage] = useState("");

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = message.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), name: "You", text },
    ]);
    setMessage("");
  };

  return (
    <main className="room-shell">
      <header className="room-header">
        <div>
          <div className="eyebrow">Sketch room</div>
          <h1>
            Room <span className="room-code">{room?.roomId}</span>
          </h1>
        </div>
        <div className="round-status">
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
            <span className="member-count">{room?.members.length}/8</span>
          </div>
          <ol className="member-list">
            {room?.members.map((member, index) => (
              <li
                className={member ? "member is-drawing" : "member"}
                key={member.userId}
              >
                <span className="member-number">0{index + 1}</span>
                <span className="member-avatar">{member.userName.charAt(0)}</span>
                <span className="member-details">
                  <strong>{member.userName}</strong>
                  {member.isHost && <small>Host</small>}
                  {/* {member.isDrawing && (
                    <small className="drawing-label">Drawing now</small>
                  )} */}
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
