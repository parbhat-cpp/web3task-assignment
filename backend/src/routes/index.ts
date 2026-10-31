import express from "express";

import wordlistRouter from "./wordlist.route";
import createRoomRouter from "./room.route";
import type RoomService from "../services/RoomService";

const createApiRouter = (roomService: RoomService) => {
  const router = express.Router();
  router.use("/wordlist", wordlistRouter);
  router.use("/rooms", createRoomRouter(roomService));
  return router;
};

export default createApiRouter;
