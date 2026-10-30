import type z from "zod";
import { DrawSchema } from "../../../../services/RoomService";
import type RoomService from "../../../../services/RoomService";
import { EventError, SocketEvent } from "../../../core/SocketEvent";
import type { EventContext } from "../../../core/types";

type Payload = z.infer<typeof DrawSchema>;
type Result = { success: true } | { success: false; error: string };

export class DrawEvent extends SocketEvent<Payload, Result> {
  readonly name = "draw";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): Payload {
    const parsed = DrawSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(ctx: EventContext<Payload, Result>): void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      const isMember = this.roomService.isMemberInRoom(
        ctx.payload.roomId,
        ctx.socket.data.userId,
      );
      if (!room || !isMember) {
        throw new EventError("user_not_in_room");
      }

      room.members.forEach((member) => {
        if (member.userId !== ctx.socket.data.userId) {
          ctx.nsp.to(`user:${member.userId}`).emit("draw", {
            ...ctx.payload,
            userId: ctx.socket.data.userId,
          });
        }
      });
      ctx.ack?.({ ok: true, data: { success: true } });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "draw_failed" });
      console.error("Error in DrawEvent:", error);
    }
  }
}
