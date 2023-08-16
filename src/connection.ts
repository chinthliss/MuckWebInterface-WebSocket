import Core from "./core";

export  class Connection {
    private core: Core;

    /**
     * @param {Core} core Reference to the core service, so we can communicate with it
     * @param {object} options Intended more to be used by overriding classes
     */
    constructor(core: Core, options: object = {}) {
        if (typeof core !== 'object') throw "Missing or incorrect argument - core";
        this.core = core;
    }

}