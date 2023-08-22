import {init, setDebug, onPlayerChanged, onError, onStatusChanged} from "./core";

/**
 * @borrows init as init
 * @borrows setDebug as setDebug
 * @borrows onPlayerChanged as onPlayerChanged
 * @borrows onError as onError
 * @borrows onStatusChanged as onStatusChanged
 */
const websocket = {
    init: init,
    setDebug: setDebug,
    onPlayerChanged: onPlayerChanged,
    onError: onError,
    onStatusChanged: onStatusChanged
}

export default websocket
