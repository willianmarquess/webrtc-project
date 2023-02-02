import * as io from "socket.io";

export default class SocketServer {
    
    #socket;
    #clients = {};

    constructor(server) {
        this.#socket = new io.Server(server);
    }

    start() {
        this.#socket.on('connect', (socket) => {
            this.#clients[socket.id] = socket;
            socket.on('start-in-call', () => this.#notifyAllAboutNewUser(socket));
            socket.on('disconnect', () => this.#onDisconnect(socket));
            socket.on('call', (data) => this.#onSendingCall(socket, data));
            socket.on('make-answer', (data) => this.#onMakeAnswer(socket, data));
            socket.on('ice-candidate', (data) => this.#onIceCandidate(socket, data));
        });
    }

    #notifyAllAboutNewUser(socket) {
        for (const id in this.#clients) {
            if (id === socket.id) continue;
            this.#clients[id].emit('new-user', socket.id);
        }
    }

    #onDisconnect(socket) {
        delete this.#clients[socket.id];
    }

    #onSendingCall(socket, { offer, to }) {
        socket.to(to).emit('call-made', {
            offer,
            id: socket.id
        });
    }

    #onMakeAnswer(socket, { answer, to }) {
        socket.to(to).emit('answer-made', {
            answer,
            id: socket.id
        });
    }

    #onIceCandidate(socket, { candidate, to }) {
        socket.to(to).emit('add-ice-candidate', {
            candidate,
            id: socket.id
        });
    }
}