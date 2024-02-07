// Main export is the library
import {
    start,
    stop,
    setDebug,
    onPlayerChanged,
    onError,
    onSystemNotification,
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
    onSystemNotification: onSystemNotification,
    onConnectionStateChanged: onConnectionStateChanged,
    getPlayerDbref: getPlayerDbref,
    getPlayerName: getPlayerName,
    getConnectionState: getConnectionState,
    isPlayerSet: isPlayerSet,
    channel: channel
}

// But also export definitions
import {
    ConnectionState,
    ConnectionErrorCallback,
    SystemNotificationCallback,
    ChannelMessageCallback,
    ChannelMonitorCallback,
    ConnectionStateChangedCallback,
    PlayerChangedCallback,
    ConnectionOptions
} from "./defs";

export {
    ConnectionState
};
export type {
    ConnectionErrorCallback,
    SystemNotificationCallback,
    ChannelMessageCallback,
    ChannelMonitorCallback,
    ConnectionStateChangedCallback,
    PlayerChangedCallback,
    ConnectionOptions
};
