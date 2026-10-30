import type { Socket } from "socket.io";
import type RoomService from "../../../services/RoomService";
import { SocketGateway } from "../../core/SocketGateway";
import { CreateRoomEvent } from "./events/CreateRoomEvent";
import { JoinRoomEvent } from "./events/JoinRoomEvent";

export class RoomGateway extends SocketGateway {
  readonly namespace = "/room";

  constructor(private roomService: RoomService) {
    super();
  }

  protected events() {
    return [
      new CreateRoomEvent(this.roomService),
      new JoinRoomEvent(this.roomService),
    ];
  }

  protected onConnect(socket: Socket) {}
}
