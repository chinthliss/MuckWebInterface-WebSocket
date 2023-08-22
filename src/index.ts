import {init, setDebug, onPlayerChanged, onError, onStatusChanged, stopConnection} from "./core";

/**
 * @borrows init as init
 * @borrows setDebug as setDebug
 * @borrows onPlayerChanged as onPlayerChanged
 * @borrows onError as onError
 * @borrows onStatusChanged as onStatusChanged
 * @borrows stopConnection as shutdown
 */
const library = {
    init: init,
    setDebug: setDebug,
    onPlayerChanged: onPlayerChanged,
    onError: onError,
    onStatusChanged: onStatusChanged,
    shutdown: stopConnection
}

export default library
