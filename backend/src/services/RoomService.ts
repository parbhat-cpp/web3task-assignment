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

const DrawPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export const DrawSchema = z.discriminatedUnion("action", [
  z.object({
    roomId: z.string().min(1).max(10),
    action: z.literal("start"),
    point: DrawPointSchema,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    size: z.number().positive().max(10),
    tool: z.enum(["pen", "eraser"]),
  }),
  z.object({
    roomId: z.string().min(1).max(10),
    action: z.literal("segment"),
    start: DrawPointSchema,
    control: DrawPointSchema,
    end: DrawPointSchema,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    size: z.number().positive().max(10),
    tool: z.enum(["pen", "eraser"]),
  }),
  z.object({
    roomId: z.string().min(1).max(10),
    action: z.literal("end"),
    start: DrawPointSchema,
    end: DrawPointSchema,
    color: z.string().regex(/^#[0-9a-f]{6}$/i),
    size: z.number().positive().max(10),
    tool: z.enum(["pen", "eraser"]),
  }),
  z.object({
    roomId: z.string().min(1).max(10),
    action: z.literal("clear"),
  }),
]);

type Member = {
  userId: string;
  userName: string;
  isHost: boolean;
  score: number;
};

type RoomState = {
  gameState: "waiting" | "in-progress" | "finished";
  currentRound: number;
  currentDrawerId: string | null;
  currentWord: string | null;
  currentTurnStartTime: number | null;
  currentTurnEndTime: number | null;
  completedMemberIds: string[];
  guessedMemberIds: string[];
};

export type RoundParticipation = {
  completedMemberIds: string[];
  completedCount: number;
  memberCount: number;
  isComplete: boolean;
};

export type ScoreboardEntry = {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  isHost: boolean;
};

export type Room = {
  roomId: string;
  members: Array<Member>;
  state: RoomState;
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
          score: 0,
        },
      ],
      config,
      state: {
        gameState: "waiting",
        currentRound: 0,
        currentDrawerId: null,
        currentWord: null,
        currentTurnStartTime: null,
        currentTurnEndTime: null,
        completedMemberIds: [],
        guessedMemberIds: [],
      },
    };
    this.rooms.set(roomId, room);
    console.log(this.rooms);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(
        (room) =>
          room.config.isPublic &&
          room.state.gameState === "waiting" &&
          room.members.length < room.config.maxPlayers,
      )
      .map((room) => ({
        roomId: room.roomId,
        hostName:
          room.members.find((member) => member.isHost)?.userName ??
          "Unknown host",
        memberCount: room.members.length,
        maxPlayers: room.config.maxPlayers,
        rounds: room.config.rounds,
        drawTime: room.config.drawTime,
        wordCount: room.config.wordCount,
        hints: room.config.hints,
        wordMode: room.config.wordMode,
      }));
  }

  addMember(
    roomId: string,
    userName: string,
    userId: string,
  ): Member | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    if (room.state.gameState !== "waiting") return undefined;

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
      score: 0,
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
    room.state.completedMemberIds = room.state.completedMemberIds.filter(
      (memberId) => memberId !== userId,
    );
    if (room.members.length === 0) {
      this.rooms.delete(roomId);
    }
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

  startGame(roomId: string, selectedWord: string, userId?: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (room.state.gameState !== "waiting") return false;

    room.state.gameState = "in-progress";
    room.state.currentRound = 1;
    room.state.currentDrawerId = userId || room.members[0]?.userId || null;
    room.state.currentWord = selectedWord;
    room.state.completedMemberIds = [];
    room.state.guessedMemberIds = [];
    room.members.forEach((member) => {
      member.score = 0;
    });
    room.state.currentTurnStartTime = Date.now();
    room.state.currentTurnEndTime =
      room.state.currentTurnStartTime + room.config.drawTime * 1000;

    console.log(this.rooms);
    return true;
  }

  completeCurrentTurn(
    roomId: string,
    userId: string,
  ): RoundParticipation | undefined {
    const room = this.rooms.get(roomId);
    if (!room || room.state.gameState !== "in-progress") return undefined;
    if (room.state.currentDrawerId !== userId) return undefined;
    if (!this.isMemberInRoom(roomId, userId)) return undefined;

    if (!room.state.completedMemberIds.includes(userId)) {
      room.state.completedMemberIds.push(userId);
    }

    const participation = this.getRoundParticipation(roomId);
    if (!participation) return undefined;

    const currentDrawerIndex = room.members.findIndex(
      (member) => member.userId === userId,
    );
    const nextMember = room.members
      .slice(currentDrawerIndex + 1)
      .concat(room.members.slice(0, currentDrawerIndex))
      .find((member) => !room.state.completedMemberIds.includes(member.userId));

    if (nextMember) {
      room.state.currentDrawerId = nextMember.userId;
      room.state.currentWord = null;
      room.state.guessedMemberIds = [];
      room.state.currentTurnStartTime = null;
      room.state.currentTurnEndTime = null;
      return participation;
    }

    if (room.state.currentRound >= room.config.rounds) {
      room.state.gameState = "finished";
      room.state.currentDrawerId = null;
      room.state.currentWord = null;
      room.state.currentTurnStartTime = null;
      room.state.currentTurnEndTime = null;
      return participation;
    }

    room.state.currentRound += 1;
    room.state.completedMemberIds = [];
    room.state.guessedMemberIds = [];
    room.state.currentDrawerId = room.members[0]?.userId || null;
    room.state.currentWord = null;
    room.state.currentTurnStartTime = null;
    room.state.currentTurnEndTime = null;

    return participation;
  }

  selectWord(roomId: string, userId: string, selectedWord: string): boolean {
    const room = this.rooms.get(roomId);
    if (
      !room ||
      room.state.gameState !== "in-progress" ||
      room.state.currentDrawerId !== userId ||
      !this.isMemberInRoom(roomId, userId)
    ) {
      return false;
    }

    room.state.currentWord = selectedWord;
    room.state.guessedMemberIds = [];
    room.state.currentTurnStartTime = Date.now();
    room.state.currentTurnEndTime =
      room.state.currentTurnStartTime + room.config.drawTime * 1000;
    return true;
  }

  submitGuess(
    roomId: string,
    userId: string,
    guess: string,
  ): ScoreboardEntry[] | undefined {
    const room = this.rooms.get(roomId);
    if (
      !room ||
      room.state.gameState !== "in-progress" ||
      !room.state.currentWord ||
      room.state.currentDrawerId === userId ||
      room.state.guessedMemberIds.includes(userId) ||
      !this.isMemberInRoom(roomId, userId)
    ) {
      return undefined;
    }

    if (guess.trim().toLowerCase() !== room.state.currentWord.toLowerCase()) {
      return undefined;
    }

    room.state.guessedMemberIds.push(userId);
    const member = room.members.find((current) => current.userId === userId);
    if (!member) return undefined;
    member.score += 1;
    return this.getScoreboard(roomId);
  }

  getRoundParticipation(roomId: string): RoundParticipation | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const memberIds = new Set(room.members.map((member) => member.userId));
    const completedMemberIds = room.state.completedMemberIds.filter((userId) =>
      memberIds.has(userId),
    );

    return {
      completedMemberIds,
      completedCount: completedMemberIds.length,
      memberCount: room.members.length,
      isComplete:
        memberIds.size > 0 && completedMemberIds.length === memberIds.size,
    };
  }

  addScore(
    roomId: string,
    userId: string,
    points: number,
  ): ScoreboardEntry[] | undefined {
    const room = this.rooms.get(roomId);
    if (
      !room ||
      room.state.gameState === "waiting" ||
      !Number.isInteger(points) ||
      points < 0
    ) {
      return undefined;
    }

    const member = room.members.find((current) => current.userId === userId);
    if (!member) return undefined;

    member.score += points;
    return this.getScoreboard(roomId);
  }

  getScoreboard(roomId: string): ScoreboardEntry[] | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    return room.members
      .map((member) => ({
        userId: member.userId,
        userName: member.userName,
        score: member.score,
        isHost: member.isHost,
      }))
      .sort((left, right) => right.score - left.score)
      .map((member, index) => ({
        rank: index + 1,
        ...member,
      }));
  }
}

export default RoomService;
