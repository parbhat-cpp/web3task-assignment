import type { Socket } from "socket.io";
import type RoomService from "../../../services/RoomService.js";
import { SocketGateway } from "../../core/SocketGateway.js";
import { CreateRoomEvent } from "./events/CreateRoomEvent.js";
import { JoinRoomEvent } from "./events/JoinRoomEvent.js";
import { RemoveMemberEvent } from "./events/RemoveMemberEvent.js";
import { LeaveRoomEvent } from "./events/LeaveRoomEvent.js";
import { SendChatEvent } from "./events/SendChatEvent.js";
import { DrawEvent } from "./events/DrawEvent.js";
import { StartGameEvent } from "./events/StartGameEvent.js";
import { GameTurnEndEvent } from "./events/GameTurnEndEvent.js";
import { SelectWordEvent } from "./events/SelectWordEvent.js";

export class RoomGateway extends SocketGateway {
  readonly namespace = "/room";

  constructor(private roomService: RoomService) {
    super();
  }

  protected events() {
    return [
      new CreateRoomEvent(this.roomService),
      new JoinRoomEvent(this.roomService),
      new RemoveMemberEvent(this.roomService),
      new LeaveRoomEvent(this.roomService),
      new SendChatEvent(this.roomService),
      new DrawEvent(this.roomService),
      new StartGameEvent(this.roomService),
      new GameTurnEndEvent(this.roomService),
      new SelectWordEvent(this.roomService),
    ];
  }

  protected onConnect(socket: Socket) {
    socket.join(`user:${socket.data.userId}`);
    socket.emit("session", { userId: socket.data.userId });
  }
}
