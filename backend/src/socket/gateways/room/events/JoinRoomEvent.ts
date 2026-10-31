import type z from "zod";
import { EventError, SocketEvent } from "../../../core/SocketEvent.js";
import { JoinRoomSchema, type Room } from "../../../../services/RoomService.js";
import type RoomService from "../../../../services/RoomService.js";
import type { EventContext } from "../../../core/types.js";

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
      const result = this.roomService.addMember(
        ctx.payload.roomId,
        ctx.payload.userName,
        ctx.socket.data.userId,
      );
      if (!result) {
        throw new EventError("room_join_failed");
      }
      const roomData = this.roomService.getRoom(ctx.payload.roomId);
      if (!roomData) {
        throw new EventError("room_not_found");
      }
      ctx.socket.emit("room_joined", {
        roomId: ctx.payload.roomId,
        userName: ctx.payload.userName,
        roomData,
      });
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        throw new EventError("room_not_found");
      }
      room.members.forEach((member) => {
        if (member.userId !== ctx.socket.data.userId) {
          ctx.nsp.to(`user:${member.userId}`).emit("room_member_joined", {
            roomId: ctx.payload.roomId,
            userName: ctx.payload.userName,
            roomData,
          });
        }
      });
      ctx.ack?.({ ok: true, data: { success: true, roomData } });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "Unable to join room" });
      console.error("Error in JoinRoomEvent:", error);
    }
  }
}
