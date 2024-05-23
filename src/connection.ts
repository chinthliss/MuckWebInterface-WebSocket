export default abstract class Connection {

    encodeDataForConnection(data: string): string {
        if (typeof data == 'undefined') return '';
        // Attempt to try to replace certain unicode special characters with ANSI ones.
        data = data
            .replace(/[\u2018\u2019\u201A]/g, "'")
            .replace(/[\u201C\u201D\u201E]/g, '"')
            .replace(/\u2026/g, "...")
            .replace(/[\u2013\u2014]/g, "-")
            .replace(/\u02C6/g, "^")
            .replace(/\u2039/g, "<")
            .replace(/\u203A/g, ">")
            .replace(/[\u02DC\u00A0]/g, " ")
        return JSON.stringify(data);
    }

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