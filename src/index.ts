import {
    init,
    setDebug,
    onPlayerChanged,
    onError,
    onConnectionStateChanged,
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
    onConnectionStateChanged: onConnectionStateChanged,
    shutdown: stopConnection,
    getPlayerDbref: getPlayerDbref,
    getPlayerName: getPlayerName,
    getConnectionState: getConnectionState,
    isPlayerSet: isPlayerSet,
    channel: channel
}
