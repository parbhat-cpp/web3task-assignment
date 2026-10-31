import type { Socket } from "socket.io";
import type RoomService from "../../../services/RoomService";
import { SocketGateway } from "../../core/SocketGateway";
import { CreateRoomEvent } from "./events/CreateRoomEvent";
import { JoinRoomEvent } from "./events/JoinRoomEvent";
import { RemoveMemberEvent } from "./events/RemoveMemberEvent";
import { LeaveRoomEvent } from "./events/LeaveRoomEvent";
import { SendChatEvent } from "./events/SendChatEvent";
import { DrawEvent } from "./events/DrawEvent";
import { StartGameEvent } from "./events/StartGameEvent";
import { GameTurnEndEvent } from "./events/GameTurnEndEvent";
import { SelectWordEvent } from "./events/SelectWordEvent";

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
