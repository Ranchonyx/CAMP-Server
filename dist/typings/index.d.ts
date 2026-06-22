import type {EventEmitter} from "node:events";
import type http from "node:http";
import type {Readable} from "node:stream";
import {CAMPBaseManager} from "../../src/CAMPServerWebsocketSession/Namespaces/CAMP.Base.ts";
import {CAMPTransactionManager} from "../../src/CAMPServerWebsocketSession/Namespaces/CAMP.Transaction.ts";
import {CAMPExtensionExecutor} from "../../src/CAMPExtension/CAMPExtensionRegistry";
import {AckTracker} from "../../src/Common/AckTracker/AckTracker.ts";
import {CAMP_FLOW_BEHAVIOUR} from "camp-protocol";

export type CAMPReadable = Readable & { txId: number };

/**
 * CAMPServerWebsocketSession typings
 * */
export declare interface ICAMPServerWebsocketSessionEvents {
    "message-utf8": (message: string) => Promise<void>;
    "message-binary": (message: Buffer) => Promise<void>;
    "message-error": (message: string) => Promise<void>;

    "stat-rtt": (stat: number) => Promise<void>;
    "stat-ack-timeout": (stat: number) => Promise<void>;
    "stat-bytes-rx": (stat: number) => Promise<void>;
    "stat-bytes-tx": (stat: number) => Promise<void>;

    "connected": () => void;
    "closed": () => void;
}

export declare type CAMPWebsocketSessionDefaultMetadata = {
    sid: bigint;
}

export declare interface CAMPServerWebsocketSession<TStorageKeys extends string = string> {
    on<U extends keyof ICAMPServerWebsocketSessionEvents>(event: U, listener: ICAMPServerWebsocketSessionEvents[U]): this;

    emit<U extends keyof ICAMPServerWebsocketSessionEvents>(event: U, ...args: Parameters<ICAMPServerWebsocketSessionEvents[U]>): boolean;
}

export declare class CAMPBaseManager {
    /**
     * Send a ping to the client
     * */
    public Ping(): Promise<void>;

    /**
     * Send a UTF8 message to the client
     * */
    public SendUTF8(message: string): Promise<void>;

    /**
     * Send a binary Message to the client
     * */
    public SendBinary(message: Buffer): Promise<void>;

    /**
     * Send an error message to the client
     * */
    public SendError(message: string): Promise<void>;
}

export declare class CAMPTransactionManager {
    /**
     * Stream a readable to the client
     * @param source The {@link Readable} object to be streamed
     * @param streamName Optionally, the name of the stream
     * */
    public Stream(source: Readable, options: { streamName: string, behaviour: CAMP_FLOW_BEHAVIOUR }): Promise<void>;

    /**
     * Wait for an incoming stream
     * @param streamName The name of the stream to wait for - leave empty to wait for an unnamed stream
     * @param timeout The amount of milliseconds to wait until the operation should be cancelled if no matching stream was received
     * */
    public WaitForStream(streamName?: string, timeout?: number): Promise<CAMPReadable>;

    /**
     * Request a range of chunks from the stream - used when flow control = TX_PULL
     * @param stream The readable object returned by {@link WaitForStream}
     * @param start The starting index of chunks to be requested
     * @param end The ending index of chunks to be requested
     * */
    public StreamRequestRange(stream: CAMPReadable, start: number, end: number): Promise<void>;

    /**
     * Sets the flow control for this session
     * @param behaviour The flow control behaviour to set the client to
     * */
    public SetIncomingFlowControl(behaviour: CAMP_FLOW_BEHAVIOUR): Promise<void>;
}

export declare class CAMPServerWebsocketSession<TStorageKeys extends string = string> extends EventEmitter implements CAMPServerWebsocketSession<TStorageKeys> {
    public base: CAMPBaseManager;
    public stream: CAMPTransactionManager;

    public Close(reason: string): Promise<void>;

    public Set(key: TStorageKeys, value: any): void;

    public Get<T>(key: TStorageKeys): T;

    public get id(): bigint;
}

type Box<T> = { value: T };

export declare interface ICAMPExtension {

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

/**
 * CAMPWebsocketServer typings
 * */
export declare interface ITokenValidator {
    validate(token: string): Promise<boolean>;
}

export declare type DropPolicy = "drop-oldest" | "drop-newest" | "dedupe-latest";

export interface BackpressureOpts {
    HIGH_WATERMARK: number;
    LOW_WATERMARK: number;
    MAX_QUEUED_BYTES: number;
    MAX_QUEUE_SIZE: number;
    DROP_POLICY: DropPolicy;
}

export interface SSLOptions {
    key: Buffer;
    cert: Buffer;
}

/**
 * optimize_latency: small buffers, lower queueing delay
 *
 * optimize_memory: strict capacities, lowest mem usage
 *
 * default: fairly balanced throughput and memory use
 * */
export type BackpressureProfile = "optimize_latency" | "optimize_memory" | "default";

export interface ICAMPWebsocketServerOptions {
    keepAliveIntervalMs?: number;
    port?: number;
    backpressure?: BackpressureProfile | BackpressureOpts;
    ssl?: SSLOptions;
}

export declare interface CAMPWebsocketServerEvents {
    "session": (session: CAMPServerWebsocketSession) => void;

    "listening": () => void;
}

export declare interface CAMPWebsocketServer {
    on<U extends keyof CAMPWebsocketServerEvents>(event: U, listener: CAMPWebsocketServerEvents[U]): this;

    emit<U extends keyof CAMPWebsocketServerEvents>(event: U, ...args: Parameters<CAMPWebsocketServerEvents[U]>): boolean;
}

export declare class CAMPWebsocketServer extends EventEmitter implements CAMPWebsocketServer {
    public Destroy(): void;

    public RegisterExtension(extension: ICAMPExtension): void;

    public UnregisterExtension(extension: ICAMPExtension): void;

    public GetExtension(extensionName: string): ICAMPExtension | null;

    public ConnectPeer(host: string, bearer: string): Promise<CAMPServerWebsocketSession>;

    public get http_server(): http.Server;
}

/**
 * Create a CAMP server
 * @param pTokenValidator - An implementation of the {@link ITokenValidator} interface to validate incoming websocket connections
 * @param options - Optional arguments, {@link CAMPWebsocketServerOptions}
 * */
export declare function camp(pTokenValidator: ITokenValidator, options?: ICAMPWebsocketServerOptions): CAMPWebsocketServer;
