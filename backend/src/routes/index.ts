import express from "express";

import wordlistRouter from "./wordlist.route.js";
import createRoomRouter from "./room.route.js";
import type RoomService from "../services/RoomService.js";

const createApiRouter = (roomService: RoomService) => {
  const router = express.Router();
  router.use("/wordlist", wordlistRouter);
  router.use("/rooms", createRoomRouter(roomService));
  return router;
};

export default createApiRouter;
