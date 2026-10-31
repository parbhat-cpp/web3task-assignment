import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./Room.css";
import {
  roomAtom,
  roomConfigAtom,
  type ScoreboardEntry,
} from "../store/room.store";
import { useAtom, useAtomValue } from "jotai/react";
import { useSocket } from "../../hooks/useSocket";
import toast from "react-hot-toast";
import { MdGroupRemove } from "react-icons/md";
import { IoExit } from "react-icons/io5";
import DrawingCanvas from "../components/DrawingCanvas";
import {
  getCachedWordList,
  preloadWordList,
  type WordList,
} from "../services/wordlist";

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

type InviteLinkProps = {
  roomId: string;
};

function InviteLink({ roomId }: InviteLinkProps) {
  const inviteUrl = `${window.location.origin}/invite/${roomId}`;

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied");
    } catch (error) {
      console.error("Unable to copy invite link", error);
      toast.error("Unable to copy invite link");
    }
  };

  return (
    <button
      type="button"
      className="toolbar-button"
      onClick={copyInviteLink}
      aria-label="Copy room invite link"
    >
      Invite friends
    </button>
  );
}

function Room() {
  const socket = useSocket("room");
  const navigate = useNavigate();

  const [room, setRoom] = useAtom(roomAtom);
  const roomConfig = useAtomValue(roomConfigAtom);

  const { roomId = "unknown" } = useParams();
  const [messages, setMessages] = useState([] as Message[]);
  const [message, setMessage] = useState("");
  const [userId] = useState(localStorage.getItem("userId") ?? "");
  const [isStartGameDialogOpen, setIsStartGameDialogOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [wordList, setWordList] = useState<WordList | null>(
    getCachedWordList(),
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [scoreboard, setScoreboard] = useState<ScoreboardEntry[]>([]);
  const [remainingTurnSeconds, setRemainingTurnSeconds] = useState<
    number | null
  >(null);
  const endedTurnRef = useRef<number | null>(null);

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
    socket.on("score_updated", (data) => {
      setScoreboard(data.scoreboard);
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.roomId !== data.roomId) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          members: currentRoom.members.map((member) => {
            const scoreEntry = data.scoreboard.find(
              (entry: ScoreboardEntry) => entry.userId === member.userId,
            );
            return scoreEntry ? { ...member, score: scoreEntry.score } : member;
          }),
        };
      });
    });
    socket.on("word_selected", (data) => {
      setSelectedWord(data.currentWord);
    });
    socket.on("game_started", (data) => {
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.roomId !== data.roomId) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          state: {
            ...currentRoom.state,
            gameState: data.gameState,
            currentRound: data.currentRound,
            currentDrawerId: data.currentDrawerId,
            currentTurnStartTime: data.currentTurnStartTime,
            currentTurnEndTime: data.currentTurnEndTime,
            ...(data.completedMemberIds && {
              completedMemberIds: data.completedMemberIds,
            }),
            ...(data.guessedMemberIds && {
              guessedMemberIds: data.guessedMemberIds,
            }),
          },
        };
      });
      setIsStartGameDialogOpen(false);
    });
    socket.on("game_turn_started", (data) => {
      setSelectedWord(null);
      if (
        data.currentDrawerId === userId &&
        data.currentTurnStartTime === null
      ) {
        setSelectedWords([]);
        setSelectedCategoryId(wordList?.categories[0]?.id ?? "");
        setIsStartGameDialogOpen(true);
      }
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.roomId !== data.roomId) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          state: {
            ...currentRoom.state,
            gameState: data.gameState,
            currentRound: data.currentRound,
            currentDrawerId: data.currentDrawerId,
            currentTurnStartTime: data.currentTurnStartTime,
            currentTurnEndTime: data.currentTurnEndTime,
            ...(data.completedMemberIds && {
              completedMemberIds: data.completedMemberIds,
            }),
            ...(data.guessedMemberIds && {
              guessedMemberIds: data.guessedMemberIds,
            }),
          },
        };
      });
    });
    socket.on("game_finished", (data) => {
      setSelectedWord(null);
      setRoom((currentRoom) => {
        if (!currentRoom || currentRoom.roomId !== data.roomId) {
          return currentRoom;
        }

        return {
          ...currentRoom,
          state: {
            ...currentRoom.state,
            gameState: data.gameState,
            currentRound: data.currentRound,
            currentDrawerId: data.currentDrawerId,
            currentTurnStartTime: data.currentTurnStartTime,
            currentTurnEndTime: data.currentTurnEndTime,
            ...(data.completedMemberIds && {
              completedMemberIds: data.completedMemberIds,
            }),
            ...(data.guessedMemberIds && {
              guessedMemberIds: data.guessedMemberIds,
            }),
          },
        };
      });
      if (data.scoreboard) setScoreboard(data.scoreboard);
      setIsStartGameDialogOpen(false);
      setIsScorecardOpen(true);
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
      socket.off("score_updated");
      socket.off("word_selected");
      socket.off("game_started");
      socket.off("game_turn_started");
      socket.off("game_finished");
    };
  }, [socket, userId, wordList]);

  const handleRemoveMember = (userId: string) => {
    if (!socket) return;
    socket.emit("remove_member", {
      roomId: room?.roomId,
      reqUserId: localStorage.getItem("userId"),
      userId,
    });
  };

  const handleLeaveRoom = () => {
    if (socket && room) {
      socket.emit("leave_room", {
        roomId: room.roomId,
        userId: localStorage.getItem("userId"),
      });
    }
    setRoom(null);
    navigate("/");
  };

  useEffect(() => {
    if (wordList) return;

    preloadWordList()
      .then(setWordList)
      .catch((error: unknown) => {
        console.error("Unable to load word list", error);
        toast.error("Unable to load words");
      });
  }, [wordList]);

  useEffect(() => {
    const turnEndTime = room?.state.currentTurnEndTime;
    if (!turnEndTime) {
      setRemainingTurnSeconds(null);
      return;
    }

    const updateRemainingTime = () => {
      const seconds = Math.max(0, Math.ceil((turnEndTime - Date.now()) / 1000));
      setRemainingTurnSeconds(seconds);

      if (
        seconds === 0 &&
        endedTurnRef.current !== turnEndTime &&
        room &&
        room.state.currentDrawerId === userId &&
        socket
      ) {
        endedTurnRef.current = turnEndTime;
        socket.emit("game_turn_end", {
          roomId: room.roomId,
          userId,
        });
      }
    };

    updateRemainingTime();
    const timerId = window.setInterval(updateRemainingTime, 250);

    return () => {
      window.clearInterval(timerId);
    };
  }, [
    room?.roomId,
    room?.state.currentDrawerId,
    room?.state.currentTurnEndTime,
    socket,
    userId,
  ]);

  const selectedCategory =
    wordList?.categories.find(
      (category) => category.id === selectedCategoryId,
    ) ?? wordList?.categories[0];
  const wordCount = roomConfig?.wordCount ?? 1;
  const drawTime = roomConfig?.drawTime ?? 60;
  const turnSeconds = remainingTurnSeconds ?? drawTime;
  const formattedDrawTime = `${String(Math.floor(turnSeconds / 60)).padStart(
    2,
    "0",
  )}:${String(turnSeconds % 60).padStart(2, "0")}`;

  const openStartGameDialog = () => {
    setSelectedWords([]);
    setSelectedCategoryId(wordList?.categories[0]?.id ?? "");
    setIsStartGameDialogOpen(true);
  };

  const toggleWord = (word: string) => {
    setSelectedWords((current) => {
      if (current.includes(word)) {
        return current.filter((selectedWord) => selectedWord !== word);
      }
      if (current.length >= wordCount) return current;
      return [...current, word];
    });
  };

  const handleStartGame = () => {
    if (!socket || !room || selectedWords.length !== wordCount) return;

    const eventName =
      room.state.gameState === "waiting" ? "start_game" : "select_word";
    socket.emit(eventName, {
      roomId: room.roomId,
      selectedWord: selectedWords[0],
      userId,
    });
    setSelectedWord(selectedWords[0]);
  };

  const displayedScoreboard =
    scoreboard.length > 0
      ? scoreboard
      : (room?.members ?? []).map((member, index) => ({
          rank: index + 1,
          userId: member.userId,
          userName: member.userName,
          score: member.score,
          isHost: member.isHost,
        }));

  return (
    <main className="room-shell">
      <header className="room-header">
        <div>
          <h2>
            Room <span className="room-code">{room?.roomId}</span>
          </h2>
        </div>
        <div className="round-status">
          {roomId !== "unknown" && <InviteLink roomId={roomId} />}
          <button
            type="button"
            className="toolbar-button leave-room-button"
            onClick={handleLeaveRoom}
            aria-label="Leave room"
            title="Leave room"
          >
            <IoExit size={22} />
          </button>
          <span className="status-dot" aria-hidden="true" />
          <span>
            Round {room?.state.currentRound ?? 1} of {roomConfig?.rounds ?? 1}
          </span>
          <strong>{formattedDrawTime}</strong>
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
              {room?.members.length}/{roomConfig?.maxPlayers}
            </span>
          </div>
          <ol className="member-list">
            {room?.members.map((member, index) => (
              <li
                className={
                  member.userId === room.state.currentDrawerId
                    ? "member is-drawing"
                    : "member"
                }
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
                  {member.userId === room.state.currentDrawerId && (
                    <small className="drawing-label">Drawing now</small>
                  )}
                </span>
                <span>
                  {userId === room?.members[0].userId &&
                    userId !== member.userId && (
                      <span onClick={() => handleRemoveMember(member.userId)}>
                        <MdGroupRemove />
                      </span>
                    )}
                </span>
                {member.userId === room.state.currentDrawerId && (
                  <span className="turn-indicator" aria-label="Current turn">
                    ●
                  </span>
                )}
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
            {selectedWord && room?.state.currentDrawerId === userId && (
              <span className="canvas-label">Your word: {selectedWord}</span>
            )}
            {(room?.members[0].userId === userId ||
              room?.state.currentDrawerId === userId) && (
              <button
                type="button"
                className="start-game-button"
                onClick={openStartGameDialog}
                disabled={!!remainingTurnSeconds}
              >
                Select word and Start game
              </button>
            )}
          </div>
          <DrawingCanvas
            roomId={roomId}
            turnKey={`${room?.state.currentRound ?? 0}:${room?.state.currentDrawerId ?? "none"}`}
          />
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

      {isStartGameDialogOpen && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsStartGameDialogOpen(false);
            }
          }}
        >
          <section
            className="start-game-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-game-title"
          >
            <div className="dialog-header">
              <div>
                <span className="panel-kicker">Choose the prompt</span>
                <h2 id="start-game-title">Start game</h2>
              </div>
              <button
                type="button"
                className="dialog-close"
                onClick={() => setIsStartGameDialogOpen(false)}
                aria-label="Close start game dialog"
              >
                ×
              </button>
            </div>

            <label className="word-category-field">
              <span>Category</span>
              <select
                value={selectedCategory?.id ?? ""}
                onChange={(event) => {
                  setSelectedCategoryId(event.target.value);
                  setSelectedWords([]);
                }}
              >
                {wordList?.categories.map((category) => (
                  <option value={category.id} key={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="word-picker">
              <div className="word-picker-heading">
                <span>Words</span>
                <small>
                  {selectedWords.length}/{wordCount} selected
                </small>
              </div>
              <div className="word-options">
                {selectedCategory?.words.map((word) => (
                  <button
                    type="button"
                    className={
                      selectedWords.includes(word)
                        ? "word-option selected"
                        : "word-option"
                    }
                    onClick={() => toggleWord(word)}
                    key={word}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>

            <div className="dialog-actions">
              <button
                type="button"
                className="dialog-cancel"
                onClick={() => setIsStartGameDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartGame}
                disabled={selectedWords.length !== wordCount}
              >
                Start game
              </button>
            </div>
          </section>
        </div>
      )}

      {isScorecardOpen && (
        <div className="dialog-backdrop">
          <section
            className="start-game-dialog scorecard-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scorecard-title"
          >
            <div className="dialog-header">
              <div>
                <span className="panel-kicker">Game complete</span>
                <h2 id="scorecard-title">Final scorecard</h2>
              </div>
            </div>
            <ol className="scorecard-list">
              {displayedScoreboard.map((entry) => (
                <li key={entry.userId}>
                  <span className="scorecard-rank">{entry.rank}</span>
                  <span className="scorecard-player">
                    <strong>{entry.userName}</strong>
                    {entry.userId === userId && <small>You</small>}
                  </span>
                  <strong className="scorecard-score">{entry.score}</strong>
                </li>
              ))}
            </ol>
            <button type="button" onClick={handleLeaveRoom}>
              Exit to home
            </button>
          </section>
        </div>
      )}
    </main>
  );
}

export default Room;
