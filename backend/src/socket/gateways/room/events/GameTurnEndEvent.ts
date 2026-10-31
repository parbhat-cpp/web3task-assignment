import z from "zod";
import { EventError, SocketEvent } from "../../../core/SocketEvent";
import type RoomService from "../../../../services/RoomService";
import type { EventContext } from "../../../core/types";

const GameTurnEndSchema = z.object({
  roomId: z.string().min(1).max(10),
  userId: z.string().min(1).max(36),
});

type Payload = z.infer<typeof GameTurnEndSchema>;
type Result = { success: true } | { success: false; error: string };

export class GameTurnEndEvent extends SocketEvent<Payload, Result> {
  readonly name = "game_turn_end";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): Payload {
    const parsed = GameTurnEndSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(ctx: EventContext<Payload, Result>): void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        throw new EventError("room_not_found");
      }

      if (ctx.socket.data.userId !== ctx.payload.userId) {
        throw new EventError("user_not_authorized");
      }

      const participation = this.roomService.completeCurrentTurn(
        ctx.payload.roomId,
        ctx.payload.userId,
      );
      if (!participation) {
        throw new EventError("turn_not_active");
      }

      const updatedRoom = this.roomService.getRoom(ctx.payload.roomId);
      if (!updatedRoom) {
        throw new EventError("room_not_found");
      }

      const turnPayload = {
        roomId: updatedRoom.roomId,
        gameState: updatedRoom.state.gameState,
        currentRound: updatedRoom.state.currentRound,
        currentDrawerId: updatedRoom.state.currentDrawerId,
        currentTurnStartTime: updatedRoom.state.currentTurnStartTime,
        currentTurnEndTime: updatedRoom.state.currentTurnEndTime,
        completedMemberIds: updatedRoom.state.completedMemberIds,
        scoreboard: updatedRoom.state.gameState === "finished"
          ? this.roomService.getScoreboard(updatedRoom.roomId)
          : undefined,
      };

      updatedRoom.members.forEach((member) => {
        ctx.nsp.to(`user:${member.userId}`).emit(
          updatedRoom.state.gameState === "finished"
            ? "game_finished"
            : "game_turn_started",
          turnPayload,
        );
      });

      ctx.ack?.({ ok: true, data: { success: true } });
    } catch (error) {
      const message = error instanceof EventError ? error.message : "turn_end_failed";
      ctx.ack?.({ ok: false, error: message });
      console.error("Error in GameTurnEndEvent:", error);
    }
  }
}
