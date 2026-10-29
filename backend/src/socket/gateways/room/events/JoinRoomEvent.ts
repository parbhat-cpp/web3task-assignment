import type z from "zod";
import { EventError, SocketEvent } from "../../../core/SocketEvent";
import { JoinRoomSchema, type Room } from "../../../../services/RoomService";
import type RoomService from "../../../../services/RoomService";
import type { EventContext } from "../../../core/types";

type Payload = z.infer<typeof JoinRoomSchema>;
type Result = {
  success: true;
  roomData: Room;
};

export class JoinRoomEvent extends SocketEvent<Payload, Result> {
  readonly name = "join_room";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): { roomId: string; userName: string } {
    const parsed = JoinRoomSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(
    ctx: EventContext<{ roomId: string; userName: string }, Result>,
  ): Promise<void> | void {
    try {
      const result = this.roomService.addMember(ctx.payload.roomId, ctx.payload.userName);
      if (!result) {
        throw new EventError("room_join_failed");
      }
      const roomData = this.roomService.getRoom(ctx.payload.roomId);
      if (!roomData) {
        throw new EventError("room_not_found");
      }
      ctx.nsp.emit("room_joined", {
        roomId: ctx.payload.roomId,
        userName: ctx.payload.userName,
      });
      ctx.ack?.({ ok: true, data: { success: true, roomData } });
    } catch (error) {
      throw new EventError("room_join_failed");
    }
  }
}
