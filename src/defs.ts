// Pretty much just here so that it can be replaced if required
export const InitialMode = import.meta.env.MODE;

export enum ConnectionState {
    disconnected = 'disconnected', // Used before startup or after shutdown
    queued = 'queued',
    connecting = 'connecting',
    connected = 'connected'
}

export interface ConnectionOptions {
    environment?: string;
    websocketUrl?: string;
    authenticationUrl?: string;
    useFaker?: boolean;
}

export type ChannelMessageCallback = (
    (data: any) => void
)

export type ChannelMonitorCallback = (
    (message: string, data: any, outgoing: boolean) => void
)

export type ConnectionStateChangedCallback = (
    (status: ConnectionState) => void
)

export type ConnectionErrorCallback = (
    (error: string) => void
)

export type PlayerChangedCallback = (
    (playerDbref: number | null, playerName: string | null) => void
)
