import ExpressServer from "./ExpressServer";
import SocketServer from "./SocketServer";

export default () => {
  const expressServer = new ExpressServer();
  const expressServerInstance = expressServer.server;

  const socketServer = new SocketServer(expressServerInstance);
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
