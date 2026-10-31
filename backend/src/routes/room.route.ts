import express from "express";
import type RoomService from "../services/RoomService";
import { getPublicRooms } from "../controller/room.controller";

const createRoomRouter = (roomService: RoomService) => {
  const router = express.Router();
  router.get("/public", getPublicRooms(roomService));
  return router;
};

export default createRoomRouter;
