import z from "zod";
import { SocketEvent } from "../../../core/SocketEvent.js";
import type RoomService from "../../../../services/RoomService.js";
import type { EventContext } from "../../../core/types.js";

const StartGameSchema = z.object({
  userId: z.string().min(1).max(36).optional(),
  roomId: z.string().min(1).max(10),
  selectedWord: z.string().min(1).max(20),
});
type Payload = z.infer<typeof StartGameSchema>;
type Result =
  | { success: true; message: string }
  | { success: false; error: string };

export class StartGameEvent extends SocketEvent<Payload, Result> {
  readonly name = "start_game";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): {
    roomId: string;
    selectedWord: string;
    userId?: string | undefined;
  } {
    const parsed = StartGameSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(
    ctx: EventContext<
      { roomId: string; selectedWord: string; userId?: string | undefined },
      Result
    >,
  ): Promise<void> | void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        ctx.ack?.({
          ok: false,
          error: "Room not found.",
        });
        return;
      }

      if (room.state.gameState !== "waiting") {
        ctx.ack?.({
          ok: false,
          error: "Game has already started.",
        });
        return;
      }

      const isMember = this.roomService.isMemberInRoom(
        ctx.payload.roomId,
        ctx.socket.data.userId,
      );
      if (!isMember) {
        ctx.ack?.({
          ok: false,
          error: "You are not a member of this room.",
        });
        return;
      }

      const gameStarted = this.roomService.startGame(
        ctx.payload.roomId,
        ctx.payload.selectedWord,
        ctx.payload.userId || ctx.socket.data.userId,
      );

      if (!gameStarted) {
        ctx.ack?.({
          ok: false,
          error: "Failed to start the game. Please try again.",
        });
        return;
      }

      const updatedRoom = this.roomService.getRoom(ctx.payload.roomId);
      if (!updatedRoom) {
        ctx.ack?.({
          ok: false,
          error: "Room not found after starting the game.",
        });
        return;
      }

      const respPayload = {
        roomId: ctx.payload.roomId,
        gameState: updatedRoom.state.gameState,
        currentRound: updatedRoom.state.currentRound,
        currentDrawerId: updatedRoom.state.currentDrawerId,
        currentTurnStartTime: updatedRoom.state.currentTurnStartTime,
        currentTurnEndTime: updatedRoom.state.currentTurnEndTime,
        wordLength: updatedRoom.state.currentWord?.length ?? 0,
        completedMemberIds: updatedRoom.state.completedMemberIds,
      };

      updatedRoom.members.forEach((member) => {
        ctx.nsp.to(`user:${member.userId}`).emit("game_started", respPayload);
      });

      ctx.ack?.({
        ok: true,
        data: { success: true, message: "Game started successfully." },
      });
    } catch (error) {
      ctx.ack?.({
        ok: false,
        error: "Failed to start the game. Please try again.",
      });
      console.error(`Failed to start the game, ${error}`);
    }
  }
}
