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

export const RemoveMemberSchema = z.object({
  roomId: z.string().min(1).max(10),
  reqUserId: z.string().min(1).max(36),
  userId: z.string().min(1).max(36),
});

export const LeaveRoomSchema = z.object({
  roomId: z.string().min(1).max(10),
  userId: z.string().min(1).max(36),
});

export const SendChatSchema = z.object({
  roomId: z.string().min(1).max(10),
  userId: z.string().min(1).max(36),
  userName: z.string().min(1).max(14),
  message: z.string().min(1).max(200),
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

  isMemberInRoom(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    return room.members.some((m) => m.userId === userId);
  }

  createRoom(
    hostName: string,
    userId: string,
    config: z.infer<typeof CreateRoomSchema>,
  ): Room {
    const roomId = Math.random().toString(36).substring(2, 8);
    const room: Room = {
      roomId,
      members: [
        {
          userId,
          userName: hostName,
          isHost: true,
        },
      ],
      config,
    };
    this.rooms.set(roomId, room);
    console.log(this.rooms);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  addMember(
    roomId: string,
    userName: string,
    userId: string,
  ): Member | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (room.members.length >= room.config.maxPlayers) {
      return undefined;
    }

    const existingMember = room.members.find((m) => m.userName === userName);

    if (existingMember) {
      return undefined;
    }

    const member: Member = {
      userId,
      userName,
      isHost: false,
    };
    room.members.push(member);
    console.log(this.rooms);
    return member;
  }

  removeMember(roomId: string, userId: string): Member | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const memberIndex = room.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return undefined;

    const member = room.members[memberIndex];
    room.members.splice(memberIndex, 1);
    console.log(this.rooms);
    return member;
  }

  deleteRoom(roomId: string): boolean {
    return this.rooms.delete(roomId);
  }

  promoteToHost(roomId: string, userId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const memberIndex = room.members.findIndex((m) => m.userId === userId);
    if (memberIndex === -1) return false;

    room.members.forEach((m) => (m.isHost = false));
    if (room.members[memberIndex]) {
      room.members[memberIndex].isHost = true;
    }
    console.log(this.rooms);
    return true;
  }
}

export default RoomService;
