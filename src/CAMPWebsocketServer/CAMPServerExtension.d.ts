import {CAMPServerWebsocketSession} from "../CAMPServerWebsocketSession/CAMPServerWebsocketSession.js";
import {CAMPWebsocketServer} from "./CAMPWebsocketServer.js";

type Box<T> = { value: T }

export interface ICAMPExtension {

    /**
     * Executed upon registration of the extension on the server
     * @param server - Reference to the running CAMP websocket server
     * */
    on_register(server: CAMPWebsocketServer): void;

    /**
     * Executed upon unregistration of the extension on the server
     * @param server - Reference to the running CAMP websocket server
     * */
    on_unregister(server: CAMPWebsocketServer): void;

    /**
     * Executed before a binary message is sent to the client session
     * @param session - The CAMP websocket session
     * @param outgoing_message - The message buffer to be sent to the client
     * */
    before_send_binary?(session: CAMPServerWebsocketSession, outgoing_message: Box<Buffer>): Promise<boolean>;

    /**
     * Executed before a text message is sent to the client session
     * @param session - The CAMP websocket session
     * @param outgoing_message - The message text to be sent to the client
     * */
    before_send_utf8?(session: CAMPServerWebsocketSession, outgoing_message: Box<string>): Promise<boolean>;

    /**
     * Executed before an error message is sent to the client session
     * @param session - The CAMP websocket session
     * @param outgoing_message - The error message to be sent to the client
     * */
    before_send_error?(session: CAMPServerWebsocketSession, outgoing_message: Box<string>): Promise<boolean>;

    /**
     * Executed after a binary message is received from the client, but before the session can emit the `message-binary` event
     * @param session - The CAMP websocket session
     * @param incoming_message - The incoming binary message from the client
     * */
    on_receive_binary?(session: CAMPServerWebsocketSession, incoming_message: Box<Buffer>): Promise<boolean>;

    /**
     * Executed after a text message is received from the client, but before the session can emit the `message-utf8` event
     * @param session - The CAMP websocket session
     * @param incoming_message - The incoming text message from the client
     * */
    on_receive_utf8?(session: CAMPServerWebsocketSession, incoming_message: Box<string>): Promise<boolean>;

    /**
     * Executed after an error message is received from the client, but before the session can emit the `message-error` event
     * @param session - The CAMP websocket session
     * @param incoming_message - The incoming error message from the client
     * */
    on_receive_error?(session: CAMPServerWebsocketSession, incoming_message: Box<string>): Promise<boolean>;

    /**
     * The unique name of this extension
     * */
    name: string;
}