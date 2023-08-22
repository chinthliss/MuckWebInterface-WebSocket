import {
    init,
    setDebug,
    onPlayerChanged,
    onError,
    onStatusChanged,
    stopConnection,
    getPlayerDbref,
    getPlayerName,
    getConnectionState,
    isPlayerSet,
    channel
} from "./core";

export default {
    init: init,
    setDebug: setDebug,
    onPlayerChanged: onPlayerChanged,
    onError: onError,
    onStatusChanged: onStatusChanged,
    shutdown: stopConnection,
    getPlayerDbref: getPlayerDbref,
    getPlayerName: getPlayerName,
    getConnectionState: getConnectionState,
    isPlayerSet: isPlayerSet,
    channel: channel
}
