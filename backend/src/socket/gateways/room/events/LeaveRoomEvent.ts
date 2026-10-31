import type z from "zod";
import { LeaveRoomSchema } from "../../../../services/RoomService.js";
import { SocketEvent } from "../../../core/SocketEvent.js";
import type RoomService from "../../../../services/RoomService.js";
import type { EventContext } from "../../../core/types.js";

type Payload = z.infer<typeof LeaveRoomSchema>;
type Result = {
  success: true;
  roomId: string;
};

export class LeaveRoomEvent extends SocketEvent<Payload, Result> {
  readonly name = "leave_room";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): { roomId: string; userId: string } {
    const parsed = LeaveRoomSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(
    ctx: EventContext<{ roomId: string; userId: string }, Result>,
  ): Promise<void> | void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        throw new Error("room_not_found");
      }
      if (
        room.members[0] !== undefined &&
        ctx.payload.userId === room.members[0].userId
      ) {
        this.roomService.promoteToHost(
          ctx.payload.roomId,
          room.members[1]?.userId || "",
        );
      }
      const isRemoved = this.roomService.removeMember(
        ctx.payload.roomId,
        ctx.payload.userId,
      );
      if (!isRemoved) {
        throw new Error("member_not_found");
      }
      const updatedRoom = this.roomService.getRoom(ctx.payload.roomId);
      if (!updatedRoom) {
        throw new Error("room_not_found");
      }
      updatedRoom.members.forEach((member) => {
        ctx.nsp.to(`user:${member.userId}`).emit("member_left", {
          roomId: ctx.payload.roomId,
          memberName: isRemoved.userName,
          roomData: updatedRoom,
        });
      });
      ctx.ack?.({
        ok: true,
        data: { success: true, roomId: ctx.payload.roomId },
      });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "leave_room_failed" });
      console.error("Error in LeaveRoomEvent:", error);
    }
  }
}
