import { CAMPWebsocketServer } from "./CAMPWebsocketServer/CAMPWebsocketServer.js";
/**
 * Create a CAMP server
 * @param pTokenValidator - An implementation of the {@link ITokenValidator} interface to validate incoming websocket connections
 * @param options - Optional arguments, {@link ICAMPWebsocketServerOptions}
 * */
//noinspection JSUnusedGlobalSymbols
export function camp(pTokenValidator, options) {
    return CAMPWebsocketServer.Create(pTokenValidator, options);
}
