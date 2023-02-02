import { io } from "https://cdn.socket.io/4.5.1/socket.io.esm.min.js";

export default class WebSocketManager {

    static #socketInstance = null;

    static async connect() {
        console.log('connecting to websocket server');
        const socket = io();
        this.#socketInstance = await new Promise((resolve, reject) => {
            socket.once('connect', () => resolve(socket));
            socket.once('connect_error', () => reject(new Error('connect_error')));
            socket.once('connect_timeout', () => reject(new Error('connect_timeout')));
        })
        console.log('websocket server connected');
        return this.#socketInstance;
    }
}