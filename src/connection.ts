import Core from "./core";

export default abstract class Connection {
    protected core: Core;

    /**
     * @param {Core} core Reference to the core service, so we can communicate with it
     * @param {object} options Intended more to be used by overriding classes
     */
    protected constructor(core: Core, options: object = {}) {
        if (typeof core !== 'object') throw "Missing or incorrect argument - core";
        this.core = core;
    }

    /////////////////////////////////////
    //Functions that should be replaced
    /////////////////////////////////////

    /**
     * Start up the connection
     */
    abstract connect(): void;

    /**
     * Send a string over the connection
     * @param stringToSend
     */
    abstract sendString(stringToSend:string): void;

}