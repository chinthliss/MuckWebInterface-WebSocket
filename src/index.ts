import Core from "./core";

const core = new Core();

/**
 * @borrows setDebug as setDebug
 * @borrows init as init
 */
const websocket = {
    reset: () => {

    },

    init: core.init,
    setDebug: core.setDebug
}

export default websocket;
