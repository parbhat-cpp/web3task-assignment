import { atom } from "jotai";
import type { CreateRoomPayload } from "../pages/Home";

type Room = {
  roomId: string;
  members: Array<{
    userId: string;
    userName: string;
    isHost: boolean;
  }>;
  config: CreateRoomPayload;
};

export const roomAtom = atom<Room | null>(null);
