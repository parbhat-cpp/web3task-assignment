import { z } from "zod";

export const CreateRoomSchema = z.object({
  hostName: z.string().min(1).max(14),
  maxPlayers: z.number().int().min(2).max(20),
  rounds: z.number().int().min(2).max(10),
  drawTime: z.number().int().min(15).max(240),
  wordCount: z.number().int().min(1).max(5),
  hints: z.number().int().min(0).max(5),
  wordMode: z.enum(["normal", "hidden"]),
  isPublic: z.boolean().optional().default(true),
});

export const JoinRoomSchema = z.object({
  roomId: z.string().min(1).max(10),
  userName: z.string().min(1).max(14),
});

type Member = {
  userId: string;
  userName: string;
  isHost: boolean;
};

export type Room = {
  roomId: string;
  members: Array<Member>;
  config: z.infer<typeof CreateRoomSchema>;
};

class RoomService {
  private rooms: Map<string, Room>;

  constructor() {
    this.rooms = new Map();
  }

  createRoom(hostName: string, config: z.infer<typeof CreateRoomSchema>): Room {
    const roomId = Math.random().toString(36).substring(2, 8);
    const room: Room = {
      roomId,
      members: [
        {
          userId: Math.random().toString(36).substring(2, 8),
          userName: hostName,
          isHost: true,
        },
      ],
      config,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addMember(roomId: string, userName: string): Member | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const member: Member = {
      userId: Math.random().toString(36).substring(2, 8),
      userName,
      isHost: false,
    };
    room.members.push(member);
    return member;
  }

  removeMember(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const memberIndex = room.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return false;

    room.members.splice(memberIndex, 1);
    return true;
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }
}

export default RoomService;
