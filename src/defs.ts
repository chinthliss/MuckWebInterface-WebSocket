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

export type MessageHandlerFunction = (
    (data: any) => void
    )

export type MonitorHandlerFunction = (
    (message: string, data: any, outgoing: boolean) => void
    )
