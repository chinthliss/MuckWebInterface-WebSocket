// Pretty much just here so that it can be replaced if required
export const InitialMode = import.meta.env.MODE;

export enum ConnectionStates {
    disconnected = 'disconnected', // Only used before startup
    connecting = 'connecting',
    connected = 'connected',
    disabled = 'disabled' // For when no more attempts will happen
}

export interface CoreOptions {
    environment?: string;
    websocketUrl?: string;
    authenticationUrl?: string;
}

export type ChannelMessageCallback = (
    (data: any) => void
)

export type ChannelMonitorCallback = (
    (message: string, data: any, outgoing: boolean) => void
)

export type ConnectionStatusCallback = (
    (status: ConnectionStates) => void
)

export type ConnectionErrorCallback = (
    (error: string) => void
)

export type PlayerChangedCallback = (
    (playerDbref: number | null, playerName: string | null) => void
)
