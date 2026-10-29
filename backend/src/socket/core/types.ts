import type { Server, Namespace, Socket } from "socket.io";

export type AckResponse<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

export type Ack<T = unknown> = (res: AckResponse<T>) => void;

export interface EventContext<TPayload, TResult> {
  io: Server;
  nsp: Namespace; // emit through this, not io, so you stay in the right namespace
  socket: Socket;
  payload: TPayload;
  ack?: Ack<TResult> | undefined;
}

export type EventMiddleware<TPayload, TResult> = (
  ctx: EventContext<TPayload, TResult>,
  next: () => Promise<void>,
) => Promise<void>;
