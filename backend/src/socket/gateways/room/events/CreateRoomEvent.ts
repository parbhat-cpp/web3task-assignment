import { z } from "zod";
import { EventError, SocketEvent } from "../../../core/SocketEvent.js";
import type RoomService from "../../../../services/RoomService.js";
import type { EventContext } from "../../../core/types.js";
import { CreateRoomSchema } from "../../../../services/RoomService.js";

type Payload = z.infer<typeof CreateRoomSchema>;
type Result =
  | { success: true; roomId: string }
  | { success: false; error: string };

export class CreateRoomEvent extends SocketEvent<Payload, Result> {
  readonly name = "create_room";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): {
    isPublic: boolean;
    hostName: string;
    maxPlayers: number;
    rounds: number;
    drawTime: number;
    wordCount: number;
    hints: number;
    wordMode: "normal" | "hidden";
  } {
    const parsed = CreateRoomSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(
    ctx: EventContext<
      {
        isPublic: boolean;
        hostName: string;
        maxPlayers: number;
        rounds: number;
        drawTime: number;
        wordCount: number;
        hints: number;
        wordMode: "normal" | "hidden";
      },
      Result
    >,
  ): Promise<void> | void {
    try {
      const room = this.roomService.createRoom(
        ctx.payload.hostName,
        ctx.socket.data.userId,
        ctx.payload,
      );
      if (!room) {
        throw new EventError("room_creation_failed");
      }
      ctx.socket.emit("room_created", { roomId: room.roomId, roomData: room });
      ctx.ack?.({ ok: true, data: { success: true, roomId: room.roomId } });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "Unable to create room" });
      console.error("Error in CreateRoomEvent:", error);
    }
  }
}
