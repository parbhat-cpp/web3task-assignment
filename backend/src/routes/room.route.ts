import express from "express";
import type RoomService from "../services/RoomService.js";
import { getPublicRooms } from "../controller/room.controller.js";

const createRoomRouter = (roomService: RoomService) => {
  const router = express.Router();
  router.get("/public", getPublicRooms(roomService));
  return router;
};

export default createRoomRouter;
