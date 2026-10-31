import ExpressServer from "./ExpressServer.js";
import SocketServer from "./SocketServer.js";
import RoomService from "../services/RoomService.js";

import { RoomGateway } from "../socket/gateways/room/RoomGateway.js";

export default () => {
  const roomService = new RoomService();
  const expressServer = new ExpressServer(roomService);
  const expressServerInstance = expressServer.server;

  const socketServer = new SocketServer(expressServerInstance, [
    new RoomGateway(roomService),
  ]);
  const socketServerInstance = socketServer.instance;

  expressServer.initSocket(socketServerInstance);

  process
    .on("exit", () => {
      expressServer.close();
      socketServer.close();
    })
    .on("SIGINT", () => {
      expressServer.close();
      socketServer.close();
    });
};
