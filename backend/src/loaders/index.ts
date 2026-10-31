import ExpressServer from "./ExpressServer";
import SocketServer from "./SocketServer";
import RoomService from "../services/RoomService";

import { RoomGateway } from "../socket/gateways/room/RoomGateway";

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
