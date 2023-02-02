import express from 'express';
import cors from 'cors';
import http from 'node:http';
import SocketServer from './SocketServer.js';

export default class Server {

    #expressApp;
    #httpServer;
    #socketServer;

    constructor() {
        this.#expressApp = null;
        this.#httpServer = null;
        this.#socketServer = null;
    }

    setup() {
        const expressApp = express();
        const httpServer = http.createServer(expressApp);
        const socketServer = new SocketServer(httpServer);
        this.#expressApp = expressApp;
        this.#httpServer = httpServer;    
        this.#socketServer = socketServer;
        return this;    
    }

    registerMiddlewares() {
        this.#expressApp.use(cors());
        this.#expressApp.use(express.json());
        this.#expressApp.use('/', express.static('public'));
        this.#expressApp.get('/api/ping', (_, res) => res.send('pong'));
        return this;
    }

    registerRoutes(routes = []) {
        routes.forEach(route => this.#expressApp.use(route));
        return this;
    }
    
    start(PORT = 3333) {
        this.#socketServer.start();
        this.#httpServer.listen(PORT, () => console.log(`runnig on http://localhost:${PORT}`));
    }
}