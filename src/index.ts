import {init, setDebug} from "./core";

/**
 * @borrows setDebug as setDebug
 * @borrows init as init
 */
const websocket = {
    init: init,
    setDebug: setDebug
}

export default websocket
