import { atom } from "jotai";
import type { CreateRoomPayload } from "../pages/Home";

type Member = {
  userId: string;
  userName: string;
  isHost: boolean;
  score: number;
};

export type RoomState = {
  gameState: "waiting" | "in-progress" | "finished";
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;
  currentTurnStartTime: number | null;
  currentTurnEndTime: number | null;
  completedMemberIds: string[];
  guessedMemberIds: string[];
};

export type Room = {
  roomId: string;
  members: Member[];
  state: RoomState;
  config: CreateRoomPayload;
};

export type ScoreboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  isHost: boolean;
};

export const roomAtom = atom<Room | null>(null);
export const roomConfigAtom = atom((get) => get(roomAtom)?.config ?? null);
