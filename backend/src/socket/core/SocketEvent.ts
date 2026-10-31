import type { Socket } from "socket.io";
import type { Ack, EventContext, EventMiddleware } from "./types.js";

/** Errors safe to show the client. Anything else becomes "internal_error". */
export class EventError extends Error {}

export abstract class SocketEvent<TPayload = unknown, TResult = unknown> {
  abstract readonly name: string;
  protected readonly middleware: EventMiddleware<TPayload, TResult>[] = [];

  /** The business logic. */
  protected abstract handle(
    ctx: EventContext<TPayload, TResult>,
  ): Promise<void> | void;

  /** Override to validate/transform the raw payload (zod, class-validator...). */
  protected parse(raw: unknown): TPayload {
    return raw as TPayload;
  }

  /** Override for custom error behaviour. */
  protected onError(err: unknown, _socket: Socket, ack?: Ack<TResult>) {
    console.error(`[${this.name}]`, err);
    ack?.({
      ok: false,
      error: err instanceof EventError ? err.message : "internal_error",
    });
  }

  /** Called by the gateway for every new connection. */
  bind(socket: Socket): void {
    socket.on(this.name, async (...args: unknown[]) => {
      const last = args[args.length - 1];
      const ack =
        typeof last === "function" ? (args.pop() as Ack<TResult>) : undefined;

      try {
        const payload = this.parse(args[0]);
        await this.run({
          io: socket.nsp.server,
          nsp: socket.nsp,
          socket,
          payload,
          ack,
        });
      } catch (err) {
        this.onError(err, socket, ack);
      }
    });
  }

  private async run(ctx: EventContext<TPayload, TResult>) {
    const dispatch = async (i: number): Promise<void> => {
      const mw = this.middleware[i];
      if (!mw) return void (await this.handle(ctx));
      await mw(ctx, () => dispatch(i + 1));
    };
    await dispatch(0);
  }
}
