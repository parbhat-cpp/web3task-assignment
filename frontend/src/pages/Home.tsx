import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "../App.css";
import { useSocket } from "../../hooks/useSocket";

type WordMode = "normal" | "hidden";

type CreateRoomPayload = {
  hostName: string;
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hints: number;
  wordMode: WordMode;
  isPublic: boolean;
};

type JoinRoomPayload = {
  roomId: string;
  userName: string;
};

const initialForm: CreateRoomPayload = {
  hostName: "",
  maxPlayers: 8,
  rounds: 3,
  drawTime: 60,
  wordCount: 3,
  hints: 2,
  wordMode: "normal",
  isPublic: true,
};

const initialJoinForm: JoinRoomPayload = {
  roomId: "",
  userName: "",
};

function Home() {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [form, setForm] = useState<CreateRoomPayload>(initialForm);
  const [joinForm, setJoinForm] = useState<JoinRoomPayload>(initialJoinForm);

  const socket = useSocket("room");

  const updateField = <K extends keyof CreateRoomPayload>(
    field: K,
    value: CreateRoomPayload[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (socket) {
      if (mode === "create") {
        socket.emit("create_room", form);
      } else {
        socket.emit("join_room", joinForm);
      }
    }
  };

  useEffect(() => {
    if (socket) {
      socket.on("room_created", (data) => {
        console.log("Room created:", data);
      });

      socket.on("room_joined", (data) => {
        console.log("Room joined:", data);
      });
    }

    return () => {
      if (socket) {
        socket.off("room_created");
        socket.off("room_joined");
      }
    };
  }, [socket]);

  return (
    <main className="app-shell">
      <section className="form-card" aria-labelledby="page-title">
        <div className="eyebrow">Sketch room</div>
        <div className="mode-tabs" role="tablist" aria-label="Room action">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={mode === "create" ? "active" : ""}
            onClick={() => {
              setMode("create");
            }}
          >
            Create room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            className={mode === "join" ? "active" : ""}
            onClick={() => {
              setMode("join");
            }}
          >
            Join room
          </button>
        </div>
        <h1 id="page-title">
          {mode === "create" ? "Create a room" : "Join a room"}
        </h1>
        <p className="intro">
          {mode === "create"
            ? "Set up your game, invite your friends, and start drawing."
            : "Enter a room code and choose your name to start drawing."}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "create" ? (
            <>
              <label className="field field-full">
                <span>Host name</span>
                <input
                  type="text"
                  value={form.hostName}
                  onChange={(event) =>
                    updateField("hostName", event.target.value)
                  }
                  placeholder="Your name"
                  minLength={1}
                  maxLength={14}
                  required
                />
                <small>1–14 characters</small>
              </label>

              <div className="field-grid">
                <label className="field">
                  <span>Max players</span>
                  <input
                    type="number"
                    value={form.maxPlayers}
                    onChange={(event) =>
                      updateField("maxPlayers", Number(event.target.value))
                    }
                    min={2}
                    max={20}
                    step={1}
                    required
                  />
                  <small>2–20 players</small>
                </label>

                <label className="field">
                  <span>Rounds</span>
                  <input
                    type="number"
                    value={form.rounds}
                    onChange={(event) =>
                      updateField("rounds", Number(event.target.value))
                    }
                    min={2}
                    max={10}
                    step={1}
                    required
                  />
                  <small>2–10 rounds</small>
                </label>

                <label className="field">
                  <span>Draw time</span>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      value={form.drawTime}
                      onChange={(event) =>
                        updateField("drawTime", Number(event.target.value))
                      }
                      min={15}
                      max={240}
                      step={1}
                      required
                    />
                    <span>sec</span>
                  </div>
                  <small>15–240 seconds</small>
                </label>

                <label className="field">
                  <span>Words per turn</span>
                  <input
                    type="number"
                    value={form.wordCount}
                    onChange={(event) =>
                      updateField("wordCount", Number(event.target.value))
                    }
                    min={1}
                    max={5}
                    step={1}
                    required
                  />
                  <small>1–5 words</small>
                </label>

                <label className="field">
                  <span>Hints</span>
                  <input
                    type="number"
                    value={form.hints}
                    onChange={(event) =>
                      updateField("hints", Number(event.target.value))
                    }
                    min={0}
                    max={5}
                    step={1}
                    required
                  />
                  <small>0–5 hints</small>
                </label>
              </div>

              <fieldset className="field-group">
                <legend>Word mode</legend>
                <div className="choice-row">
                  <label className="choice">
                    <input
                      type="radio"
                      name="wordMode"
                      value="normal"
                      checked={form.wordMode === "normal"}
                      onChange={() => updateField("wordMode", "normal")}
                    />
                    <span>
                      <strong>Normal</strong>
                      <small>Words are visible to the artist</small>
                    </span>
                  </label>
                  <label className="choice">
                    <input
                      type="radio"
                      name="wordMode"
                      value="hidden"
                      checked={form.wordMode === "hidden"}
                      onChange={() => updateField("wordMode", "hidden")}
                    />
                    <span>
                      <strong>Hidden</strong>
                      <small>Keep the word hidden while drawing</small>
                    </span>
                  </label>
                </div>
              </fieldset>

              <label className="visibility-toggle">
                <input
                  type="checkbox"
                  checked={form.isPublic}
                  onChange={(event) =>
                    updateField("isPublic", event.target.checked)
                  }
                />
                <span>
                  <strong>Public room</strong>
                  <small>Anyone with the room code can join</small>
                </span>
              </label>
            </>
          ) : (
            <>
              <label className="field">
                <span>Room code</span>
                <input
                  type="text"
                  value={joinForm.roomId}
                  onChange={(event) =>
                    setJoinForm((current) => ({
                      ...current,
                      roomId: event.target.value,
                    }))
                  }
                  placeholder="e.g. abc123"
                  minLength={1}
                  maxLength={10}
                  required
                />
                <small>1–10 characters</small>
              </label>

              <label className="field">
                <span>Your name</span>
                <input
                  type="text"
                  value={joinForm.userName}
                  onChange={(event) =>
                    setJoinForm((current) => ({
                      ...current,
                      userName: event.target.value,
                    }))
                  }
                  placeholder="Your name"
                  minLength={1}
                  maxLength={14}
                  required
                />
                <small>1–14 characters</small>
              </label>
            </>
          )}

          <button type="submit">
            {mode === "create" ? "Create room" : "Join room"}{" "}
            <span aria-hidden="true">→</span>
          </button>
        </form>
      </section>
    </main>
  );
}

export default Home;
