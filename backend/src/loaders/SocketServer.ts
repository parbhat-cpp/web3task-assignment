import * as SocketIO from "socket.io";
import type { Server } from "http";
import { randomUUID } from "node:crypto";
import type { SocketGateway } from "../socket/core/SocketGateway";

class SocketServer {
  private readonly io!: SocketIO.Server;
  private readonly gateways: SocketGateway[] = [];
  private readonly userIdentityMiddleware: Parameters<
    SocketIO.Server["use"]
  >[0] = (socket, next) => {
    const userId = randomUUID();

    socket.data.userId = userId;
    this.userIdToSocketIdMap.set(userId, socket.id);

    socket.once("disconnect", () => {
      if (this.userIdToSocketIdMap.get(userId) === socket.id) {
        this.userIdToSocketIdMap.delete(userId);
      }
    });

    next();
  };
  userIdToSocketIdMap: Map<string, string> = new Map();

  constructor(server: Server, gateways: SocketGateway[] = []) {
    this.io = new SocketIO.Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        methods: ["GET", "POST"],
      },
    });
    this.io.use(this.userIdentityMiddleware);
    this.listen();
    gateways.forEach((g) => this.register(g));
  }

  private listen() {
    if (this.io) {
      console.log("Running Socket Server");
      this.io.on("connection", (socket) => {
        socket.emit("session", { userId: socket.data.userId });
      });
    }
  }

  private register(gateway: SocketGateway): this {
    if (gateway.namespace !== "/") {
      this.io.of(gateway.namespace).use(this.userIdentityMiddleware);
    }
    gateway.attach(this.io);
    this.gateways.push(gateway);
    return this;
  }

  emit(namespace: string, room: string, event: string, ...args: unknown[]) {
    this.io
      .of(namespace)
      .to(room)
      .emit(event, ...args);
  }

  close(): Promise<void> {
    return new Promise((resolve) => this.io.close(() => resolve()));
  }

  get instance(): SocketIO.Server {
    return this.io;
  }
}

export default SocketServer;
