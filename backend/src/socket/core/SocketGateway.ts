import type { Namespace, Server, Socket } from "socket.io";
import type { SocketEvent } from "./SocketEvent.js";

type NamespaceMiddleware = Parameters<Namespace["use"]>[0];

export abstract class SocketGateway {
  readonly namespace: string = "/";

  /** Custom client -> server events for this gateway. */
  protected abstract events(): SocketEvent<any, any>[];

  /** Namespace-level middleware (auth, rate limits on connect...). */
  protected middleware(): NamespaceMiddleware[] {
    return [];
  }

  // Lifecycle hooks: override only what you need.
  protected onConnect(_socket: Socket): void | Promise<void> {}
  protected onDisconnecting(_socket: Socket, _reason: string): void {}
  protected onDisconnect(_socket: Socket, _reason: string): void {}
  protected onAny(_socket: Socket, _event: string, _args: unknown[]): void {}

  attach(io: Server): void {
    const nsp = io.of(this.namespace);
    this.middleware().forEach((mw) => nsp.use(mw));

    const events = this.events(); // build once, not per connection

    nsp.on("connection", (socket) => {
      // Bind synchronously so no client event is missed
      events.forEach((e) => e.bind(socket));

      socket.onAny((event, ...args) => this.onAny(socket, event, args));
      socket.on("disconnecting", (reason) =>
        this.onDisconnecting(socket, reason),
      ); // rooms still available here
      socket.on("disconnect", (reason) => this.onDisconnect(socket, reason));

      Promise.resolve(this.onConnect(socket)).catch((err) =>
        console.error(`[${this.constructor.name}] onConnect`, err),
      );
    });
  }
}
