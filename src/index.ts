import {
    start,
    stop,
    setDebug,
    onPlayerChanged,
    onError,
    onConnectionStateChanged,
    getPlayerDbref,
    getPlayerName,
    getConnectionState,
    isPlayerSet,
    channel
} from "./core";

export default {
    start: start,
    stop: stop,
    setDebug: setDebug,
    onPlayerChanged: onPlayerChanged,
    onError: onError,
    onConnectionStateChanged: onConnectionStateChanged,
    getPlayerDbref: getPlayerDbref,
    getPlayerName: getPlayerName,
    getConnectionState: getConnectionState,
    isPlayerSet: isPlayerSet,
    channel: channel
}