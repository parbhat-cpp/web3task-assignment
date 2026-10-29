import * as SocketIO from "socket.io";
import type { Server } from "http";
import type { SocketGateway } from "../socket/core/SocketGateway";

class SocketServer {
  private readonly io!: SocketIO.Server;
  private readonly gateways: SocketGateway[] = [];

  constructor(server: Server, gateways: SocketGateway[] = []) {
    this.io = new SocketIO.Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        methods: ["GET", "POST"],
      },
    });
    this.listen();
    gateways.forEach((g) => this.register(g));
  }

  private listen() {
    if (this.io) {
      console.log("Running Socket Server");
      this.io.on("connection", (socket) => {
        console.log("connected");
      });
    }
  }

  private register(gateway: SocketGateway): this {
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
