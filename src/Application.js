import Server from "./interface/Server.js";

export default class Application {
    
    #server;

    constructor() {
        this.#server = new Server();
    }
    
    setup() {
        this.#server
            .setup()
            .registerMiddlewares();
        return this;
    }

    start() {
        this.#server.start();
    }
}