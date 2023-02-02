import { VideoCallController } from "./controller/video-call.controller.js";
import WebSocketManager from "./utils/web-socket-manager.util.js";

async function bootstrap() {
    const socket = await WebSocketManager.connect();

    const callController = new VideoCallController(socket);
    await callController.config();
    await callController.start();
}


bootstrap();