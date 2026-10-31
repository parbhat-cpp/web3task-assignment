import type z from "zod";
import { SendChatSchema } from "../../../../services/RoomService";
import { EventError, SocketEvent } from "../../../core/SocketEvent";
import type RoomService from "../../../../services/RoomService";
import type { EventContext } from "../../../core/types";

type Payload = z.infer<typeof SendChatSchema>;
type Result =
  | { success: true; data: unknown }
  | { success: false; error: string };

export class SendChatEvent extends SocketEvent<Payload, Result> {
  readonly name = "send_chat";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): {
    roomId: string;
    userId: string;
    userName: string;
    message: string;
  } {
    const parsed = SendChatSchema.parse(raw);
    return {
      roomId: parsed.roomId,
      userId: parsed.userId,
      userName: parsed.userName,
      message: parsed.message,
    };
  }

  protected handle(
    ctx: EventContext<
      { roomId: string; userId: string; userName: string; message: string },
      Result
    >,
  ): Promise<void> | void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        throw new EventError("room_not_found");
      }
      const isMember = this.roomService.isMemberInRoom(
        ctx.payload.roomId,
        ctx.payload.userId,
      );
      if (!isMember) {
        throw new EventError("user_not_in_room");
      }
      const scoreboard = this.roomService.submitGuess(
        ctx.payload.roomId,
        ctx.payload.userId,
        ctx.payload.message,
      );
      if (scoreboard) {
        room.members.forEach((member) => {
          ctx.nsp.to(`user:${member.userId}`).emit("score_updated", {
            roomId: room.roomId,
            scoreboard,
            guessedBy: ctx.payload.userId,
          });
        });
      }
      room.members.forEach((member) => {
        if (member.userId !== ctx.payload.userId) {
          ctx.nsp.to(`user:${member.userId}`).emit("receive_chat", {
            roomId: ctx.payload.roomId,
            userId: ctx.payload.userId,
            userName: ctx.payload.userName,
            message: ctx.payload.message,
          });
        }
      });
      ctx.ack?.({ ok: true, data: { success: true, data: ctx.payload } });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "send_chat_failed" });
      console.error("Error in SendChatEvent:", error);
    }
  }
}
