import ExpressServer from "./ExpressServer";
import SocketServer from "./SocketServer";
import RoomService from "../services/RoomService";

import { RoomGateway } from "../socket/gateways/room/RoomGateway";

export default () => {
  const expressServer = new ExpressServer();
  const expressServerInstance = expressServer.server;

  const socketServer = new SocketServer(expressServerInstance, [
    new RoomGateway(new RoomService()),
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
