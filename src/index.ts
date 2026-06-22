import {
    CAMPWebsocketServer,
    ICAMPWebsocketServerOptions,
    ITokenValidator
} from "./CAMPWebsocketServer/CAMPWebsocketServer.js";

/**
 * Create a CAMP server
 * @param pTokenValidator - An implementation of the {@link ITokenValidator} interface to validate incoming websocket connections
 * @param options - Optional arguments, {@link ICAMPWebsocketServerOptions}
 * */
//noinspection JSUnusedGlobalSymbols
export function camp(pTokenValidator: ITokenValidator, options?: ICAMPWebsocketServerOptions) {
    return CAMPWebsocketServer.Create(pTokenValidator, options);
}