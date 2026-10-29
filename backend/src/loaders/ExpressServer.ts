import type { Express } from "express";
import type { Server } from "http";
import express from "express";
import cors from "cors";
import type SocketIO from "socket.io";

class ExpressServer {
  private expressApp!: Express;
  private expressServer!: Server;
  private port!: number;

  constructor() {
    this.init();
  }

  private init() {
    this.port = Number(process.env.PORT) || 5000;
    this.expressApp = express();

    this.expressApp.use(express.json());
    this.expressApp.use(express.urlencoded({ extended: true }));
    this.expressApp.use(cors());

    this.expressApp.use((_, res, next) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization",
      );
      next();
    });

    // TODO: Add your API routes here
    this.expressApp.use("/api", (r, res) => {
      res.json({ message: "API is working!" });
    });

    this.expressServer = this.expressApp.listen(this.port, () => {
      console.log("Express server is running on port:", this.port);
    });
  }

  public close() {
    if (!this.expressApp || !this.expressServer) {
      throw new Error("Failed to stop the Express server");
    }
    this.expressServer.close((err) => {
      if (err) {
        console.error("Error occurred while stopping the Express server:", err);
      } else {
        console.log("Express server stopped");
      }
    });
  }

  public get server(): Server {
    if (!this.expressServer) {
      throw new Error("Express server is not initialized");
    }
    return this.expressServer;
  }

  public get app(): Express {
    if (!this.expressApp) {
      throw new Error("Express app is not initialized");
    }
    return this.expressApp;
  }

  public initSocket(socket: SocketIO.Server): void {
    this.expressApp.set("socket", socket);
  }
}

export default ExpressServer;
