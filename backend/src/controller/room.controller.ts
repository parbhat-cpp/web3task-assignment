import type { Request, Response } from "express";
import type RoomService from "../services/RoomService.js";

export const getPublicRooms = (roomService: RoomService) => {
  return (_req: Request, res: Response) => {
    try {
      res.status(200).json(roomService.getPublicRooms());
    } catch (error) {
      console.error("Unable to get public rooms", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
};
