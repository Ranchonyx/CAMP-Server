# CAMP

CAMP is a small binary protocol for sending arbitrary messages, large data and real-time information over WebSocket.
It uses fixed frame types for acknowledgements, heartbeats, UTF-8 text, binary payloads and streamed transactions.

This is a server implementation of the CAMP protocol specified
at [CAMP-Protocol](https://github.com/Ranchonyx/CAMP-Protocol)

## CAMP-Server / Overview

The CAMP-Server takes care of the following:

- Client session authentication
- Client session lifecycle management
- Correct framing and structuring of received and sent data

The CAMP-Server provides a public API for creating and destroying an instance.
It provides access to sessions for communication purposes via events

The CAMP-Server is extensible via its **Extension** interface. As such it is possible to, for example, implement an RPC
server.

## Setup

To set up a CAMP Server, simply import the ``CAMP`` function from the ``CAMP-server`` package.

The ``camp``-function takes two arguments:

- a required ITokenValidator object
- an optional ICAMPWebsocketServerOptions object

## Configuration

### ITokenValidator

```typescript
interface ITokenValidator {
    validate(token: string): Promise<boolean>;
}
```

This interface describes how the server will authenticate incoming connections.

CAMP-Clients send a ``token``, which you may validate in the ``validate``-function.

### ICAMPWebsocketServerOptions

```typescript
interface ICAMPWebsocketServerOptions {
    keepAliveIntervalMs?: number;
    port?: number;
    ssl?: {
        key: Buffer;
        cert: Buffer;
    };
    backpressure?: {
        highWaterMark?: number;
        lowWaterMark?: number;
        maxQueuedBytes?: number;
        maxQueueCount?: number;
        dropPolicy?: "drop-oldest" | "drop-newest" | "dedupe-latest";
    };
}
```

This interface describes various configuration options for the CAMPServer:

- keepAliveIntervalMs
    - The frequency in which the server will send application-level pings to the clients, by default ``15000`` is chosen
- port
    - The local port to listen on, by default ``8080`` is chosen

In the ``ssl`` object, you may set a `key` and a `cert` to enable SSL connections.

### Backpressure

The backpressure object allows to you control how the CAMP server handles high load and prevents memory bloating

| Option           | Type                                                | Default            | Description                                                                  |
|------------------|-----------------------------------------------------|--------------------|------------------------------------------------------------------------------|
| `highWaterMark`  | `number`                                            | `16 * 1024 * 1024` | Maximum number of bytes allowed in the send buffer before throttling starts. |
| `lowWaterMark`   | `number`                                            | `1024 * 1024`      | Once buffer usage drops below this, sending resumes.                         |
| `maxQueuedBytes` | `number`                                            | `8 * 1024 * 1024`  | Hard cap on total queued bytes. Frames beyond this are dropped.              |
| `maxQueueCount`  | `number`                                            | `1024`             | Hard cap on number of queued frames.                                         |
| `dropPolicy`     | `"drop-oldest" \| "drop-newest" \| "dedupe-latest"` | `"drop-oldest"`    | Strategy used when the queue is full.                                        |

### Drop policies

- drop-oldest
    - Keeps new data, discards the oldest frames first
- drop-newest
    - Keeps old data, discards the newest frame attempting to be sent
- dedupe-latest
    - If a frame of the same type or payload is already queued, replace it instead adding a duplicate

### Public methods

| Name                | Parameter                         | Description                                                                  | Returns                               |
|---------------------|-----------------------------------|------------------------------------------------------------------------------|---------------------------------------|
| RegisterExtension   | ext: ICAMPExtension               | Registers a server-side CAMP extension                                       |                                       |
| UnregisterExtension | ext: ICAMPExtension               | Unregisters a server-side CAMP extension                                     |                                       |
| GetExtension        | id: string                        | Gets a server-side CAMP extension by its id                                  | ICAMPExtension \| null                | 
| ConnectPeer         | host: string host, bearer: string | Connects to another CAMP-server                                              | Promise\<CAMPServerWebsocketSession\> |
| Destroy             |                                   | Closes the server and destroys all sessions                                  |                                       |
| (get) http_server   |                                   | Returns the underlying `http.Server`-object for interop with other libraries |                                       |

## CAMP-Server / Example

```typescript
import {CAMP} from "CAMP-server";

const PORT = 8080;
const server = await CAMP({
    async validate(token: string): Promise<boolean> {
        return token === "MySuperSecretToken";
    }
}, {port: PORT});

/*
The CAMP server emits events as described by the CAMPWebsocketServerEvents interface

interface CAMPWebsocketServerEvents {
  "session": (session: CAMPServerWebsocketSession) => void;

  "listening": () => void;
}

as such, we can react to when the server starts listening and react to new sessions
*/
server.on("listening", () => {
    console.info("Server is listening...");

    server.on("session", async session => {
        console.info(`Session ID: ${session.id}`);
    });
});
```

## CAMPServerWebsocketSession / Overview

### Data Events

These events are emitted when the server-side session receives data from a client-side session

| Name           | Parameter    | Description                                                    |
|----------------|--------------|----------------------------------------------------------------|
| message-utf8   | data: string | Emitted, when the session receives a utf8 text message         |
| message-binary | data: Buffer | Emitted, when the session receives an arbitrary binary message |

### Statistic Events

These events are emitted periodically and serve as a way to implement metrics, monitoring or other such things

| Name             | Parameter    | Description                                                   |
|------------------|--------------|---------------------------------------------------------------|
| stat-rtt         | data: number | EWMA Average in milliseconds between messages-ACK round trips |
| stat-bytes-rx    | data: number | Total bytes received from the client session                  |
| stat-bytes-tx    | data: number | Total bytes sent to the client session                        |
| stat-ack-timeout | data: number | Count of messages that timed out waiting for an ACK           |

### Meta events

This sad category of events is emitted when something about the session changes

| Name   | Parameter | Description                                                |
|--------|-----------|------------------------------------------------------------|
| closed |           | Emitted, when the session closes or was closed by a client |

### Public methods

| Name    | Parameter               | Description                                                       | Returns |
|---------|-------------------------|-------------------------------------------------------------------|---------|
| Set     | key: string, value: any | Sets `key` to `value` in the session's custom data store          |         |
| Get     | key: string             | Retrieves the value of `key` from the session's custom data store | any     |
| Close   | reason: string          | Closes the session gracefully                                     |         |
| Destroy |                         | Closes and destroys the session object                            |         |

CAMP-Functionality is divided among namespaces as defined in ``CAMP``.

#### Base

Accessible via ``session.base.<method>(...);``

| Name       | Parameter       | Description                              | Returns |
|------------|-----------------|------------------------------------------|---------|
| Ping       |                 | Pings the client                         |         |
| SendUTF8   | data: string    | Sends the passed utf8 text to the client |         |
| SendBinary | data: Buffer    | Sends the passed buffer to the client    |         |
| SendError  | message: string | Send an error to the client              |         |

#### Transaction

Accessible via ``session.transaction.<method>(...);``

| Name               | Parameter                                                                         | Description                                                 | Returns                 |
|--------------------|-----------------------------------------------------------------------------------|-------------------------------------------------------------|-------------------------|
| Stream             | source: Readable, options: { streamName: string, behaviour: CAMP_FLOW_BEHAVIOUR } | Streams a readable to the client                            |                         |
| WaitForStream      | name: string, timeout: number                                                     | Waits for a named stream from client                        | Promise\<CAMPReadable\> |
| StreamRequestRange | stream: CAMPReadable, start: bigint, end: bigint                                  | When in TX_PULL-mode, requests a byte range from the client |                         |

## CAMP-Server / Extension interface

The extension interface allows you to modify the behaviour of the CAMP server's message lifecycle, **before sending**
and **after receiving** per session.

Extensions can inspect and modify messages, enabling you to do custom behaviour, such as logging, filtering, building
metrics or transforming the payloads.

Extensions are registered using the CAMP-server's ``RegisterExtension``-method.

### Interface definition

````typescript
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
````

### Example extension

This is an exemplary logging extension. It simply logs each incoming and outgoing message

```typescript
import {Box, ICAMPExtension} from "./CAMPServerExtension";
import {CAMPServerWebsocketSession} from "./CAMPServerWebsocketSession";

class LoggerExtension implements ICAMPExtension {
    public name = "unique_name_for_logger";

    public async before_send_utf8(session: CAMPServerWebsocketSession, outgoing_message: Box<string>) {
        console.log(`Outgoing UTF-8 message: "${outgoing_message.value}"`);
        return true;
    }

    public async before_send_binary(session: CAMPServerWebsocketSession, outgoing_message: Box<Buffer>) {
        console.log(`Outgoing binary message: "${outgoing_message.value.toString(16)}"`);
        return true;
    }

    public async on_receive_utf8(session: CAMPServerWebsocketSession, incoming_message: Box<string>) {
        console.log(`Incoming UTF-8 message: "${outgoing_message.value}"`);
        return true;
    }

    public async before_send_utf8(session: CAMPServerWebsocketSession, incoming_message: Box<Buffer>) {
        console.log(`Incoming binary message: "${outgoing_message.value.toString(16)}"`);
        return true;
    }
}
```