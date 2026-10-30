import type { z, ZodObject, ZodString } from "zod";
import type { $strip } from "zod/v4/core";
import RoomService, {
  RemoveMemberSchema,
  type Room,
} from "../../../../services/RoomService";
import { SocketEvent } from "../../../core/SocketEvent";
import type { EventContext } from "../../../core/types";

type Payload = z.infer<typeof RemoveMemberSchema>;
type Result = {
  success: true;
  roomData: Room;
};

export class RemoveMemberEvent extends SocketEvent<Payload, Result> {
  readonly name = "remove_member";

  constructor(private roomService: RoomService) {
    super();
  }

  protected parse(raw: unknown): Payload {
    const parsed = RemoveMemberSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error("Invalid payload");
    }
    return parsed.data;
  }

  protected handle(
    ctx: EventContext<
      z.infer<
        ZodObject<
          { roomId: ZodString; reqUserId: ZodString; userId: ZodString },
          $strip
        >
      >,
      Result
    >,
  ): Promise<void> | void {
    try {
      const room = this.roomService.getRoom(ctx.payload.roomId);
      if (!room) {
        throw new Error("room_not_found");
      }
      if (
        room.members[0] !== undefined &&
        ctx.payload.reqUserId !== room.members[0].userId
      ) {
        throw new Error("not_authorized");
      }
      ctx.nsp.to(`user:${ctx.payload.userId}`).emit("leave_room", {
        roomId: ctx.payload.roomId,
      });
      const isRemoved = this.roomService.removeMember(
        ctx.payload.roomId,
        ctx.payload.userId,
      );
      if (!isRemoved) {
        throw new Error("member_not_found");
      }
      const updatedRoom = this.roomService.getRoom(ctx.payload.roomId);
      if (!updatedRoom) {
        throw new Error("room_not_found_after_removal");
      }
      updatedRoom.members.forEach((member) => {
        if (member.userId !== ctx.payload.userId) {
          ctx.nsp.to(`user:${member.userId}`).emit("room_member_removed", {
            roomId: ctx.payload.roomId,
            removedUsername: isRemoved.userName,
            roomData: updatedRoom,
          });
        }
      });
      ctx.ack?.({ ok: true, data: { success: true, roomData: updatedRoom } });
    } catch (error) {
      ctx.ack?.({ ok: false, error: "Unable to remove member" });
      console.error("Error in RemoveMemberEvent:", error);
    }
  }
}
