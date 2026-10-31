import z from "zod";
import { EventError, SocketEvent } from "../../../core/SocketEvent.js";
import type RoomService from "../../../../services/RoomService.js";
import type { EventContext } from "../../../core/types.js";

const SelectWordSchema = z.object({
  roomId: z.string().min(1).max(10),
  userId: z.string().min(1).max(36),
  selectedWord: z.string().min(1).max(20),
});

type Payload = z.infer<typeof SelectWordSchema>;
type Result = { success: true } | { success: false; error: string };

export class SelectWordEvent extends SocketEvent<Payload, Result> {
  readonly name = "select_word";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): Payload {
    const parsed = SelectWordSchema.safeParse(raw);
    if (!parsed.success) throw new Error("Invalid payload");
    return parsed.data;
  }

  protected handle(ctx: EventContext<Payload, Result>): void {
    try {
      if (ctx.socket.data.userId !== ctx.payload.userId) {
        throw new EventError("user_not_authorized");
      }

      if (
        !this.roomService.selectWord(
          ctx.payload.roomId,
          ctx.payload.userId,
          ctx.payload.selectedWord,
        )
      ) {
        throw new EventError("unable_to_select_word");
      }

      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) throw new EventError("room_not_found");

      const payload = {
        roomId: room.roomId,
        gameState: room.state.gameState,
        currentRound: room.state.currentRound,
        currentDrawerId: room.state.currentDrawerId,
        currentTurnStartTime: room.state.currentTurnStartTime,
        currentTurnEndTime: room.state.currentTurnEndTime,
        wordLength: room.state.currentWord?.length ?? 0,
      };

      room.members.forEach((member) => {
        ctx.nsp.to(`user:${member.userId}`).emit("game_turn_started", payload);
      });
      ctx.nsp.to(`user:${ctx.payload.userId}`).emit("word_selected", {
        ...payload,
        currentWord: room.state.currentWord,
      });
      ctx.ack?.({ ok: true, data: { success: true } });
    } catch (error) {
      const message =
        error instanceof EventError ? error.message : "select_word_failed";
      ctx.ack?.({ ok: false, error: message });
      console.error("Error in SelectWordEvent:", error);
    }
  }
}
