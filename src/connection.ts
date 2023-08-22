export default abstract class Connection {
    /**
     * Constructor
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
     * Stop the connection
     */
    abstract disconnect(): void;

    /**
     * Send a string over the connection
     */
    abstract sendString(stringToSend: string): void;

}