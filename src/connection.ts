export default abstract class Connection {

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