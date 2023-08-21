export default abstract class Connection {
    /**
     * @param {object} options Intended more to be used by overriding classes
     */
    protected constructor(options: object = {}) {
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
    abstract sendString(stringToSend: string): void;

}