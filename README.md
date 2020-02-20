# Noccela JS SDK

JavaScript library that provides methods to communicate with Noccela cloud partner APIs using JavaScript.

Supports both browser environments and NodeJS.

## Overview

Noccela cloud provides various third party APIs for retrieving historical information and to receive real-time events from installed locations. Historical data is mainly retrieved using REST APIs and real-time communication happens through WebSockets. This library has
some methods for calling HTTP endpoints, but to view the full specification check the
OpenAPI document.

This library hides all complexity from WS communication protocol and provides easy Promise-based implementations to register to events and filter responses.

Library also handles broken connections, re-authentication and re-registration of events in case of socket failing.

## Installation

The library is packaged as minified UMD (Universal Module Definition) which
allows it to be included as a script in browser or required directly with Node.

It can also be included as ES6 module either in Webpack or modern Node environment. This is the preferred way of using it as it preserves JSDoc
and allows it to be integrated to your own build tool.

Minified build result is in _/dist/main.min.js_.

The _npm_ package can be installed two ways.

Directly

```bash
npm install https://ADDRESS-HERE
```

Indirectly

```bash
git clone https://ADDRESS-HERE
# cd to cloned root directory
npm link
# cd to your project directory
npm link @noccela/ncc-cloud-integration
# package is linked as a dependency
```

Browser:

```html
<script src="path/to/main.min.js"></script>
```

CommonJS (Node)

```javascript
const NccIntegration = require("path/to/main.min.js");
```

ES module (Node or Webpack)

```javascript
import Ncc from "@noccela/ncc-cloud-integration";
```

## Authentication and authorization

Clients are authenticated using JWT token, sent either as _Bearer_ token in _Authorize_ HTTP header or through WebSocket. HTTP API uses header for authorization, WebSocket has special handling and doesn't need the header.

Token is requested from OAuth2 authentication server using _client credentials_ flow. The client id and secret are received when partner registers third party application in _Partner portal_.

Token has an expiration time, after which the socket will be closed. This token can be refreshed on the fly automatically by creating the connection with _connectPersistent_ instead of _connect_ and providing the client ID and client secret. This however means that these values will be cached.

Check examples for how to do it using this library.

## Examples

Fetch token with _client id_ and _client secret_.

```javascript
import * as Ncc from "@noccela/ncc-cloud-integration"

const {
    accessToken, // JWT token.
    expiresIn // Expiration in seconds.
} = await Ncc.getToken(
    **CLIENT ID**,
    **CLIENT SECRET**
);
```

Connect to cloud with the access token.

```javascript
const channel = new Ncc.EventChannel({
    /* User options, can be null. */
});

// Connect to Noccela Cloud.
await channel.connect(accessToken);

// Authenticated connection is available.
```

Connect with a persistent connection that is automatically re-authenticated when
token has less than half of its time left.

```javascript
await channel.connectPersistent(clientId, clientSecret);

// Authenticated connection is available "forever". Otherwise works just the same.
```

Subscribe to location updates.

```javascript
// Create callback.
// Callbacks use Node-convention, in which errors are
// the first argument and arguments the second!
const callback = (err, payload) => {
    // Iterate the location updates, there might be multiple!
    for (const [deviceId, data] of Object.entries(payload)) {
        const { x, y, floor } = data;

        // ...
    }
};

// Register the callback with the previously created
// connection object.
// This sends the registration message to server
// and resolves if everything was ok.
const uuid = await channel.registerLocationUpdate(
    callback,
    1, // Site account ID.
    1, // Site ID.
    [12345] // Device serial numbers, can be null for all devices on site.
);
```

Unregistering from a registered event using the UUID.

```javascript
const uuid = ...;
await channel.unregister(uuid);
```

Close the channel and underlying socket

```javascript
await channel.close();
```

Custom loggers

```javascript
const channel = new Ncc.EventChannel({
    loggers: [], // Don't log anything from library.
    loggers: [ // Custom logger.
        {
            log: msg => {},
            warn: msg => {},
            error: msg => {},
            exception: msg => {}
        }
    ]
});
```

## Events

Events are a high-level concept present in client library. It doesn't exist in cloud. User registers to "event" using client library and receives filtered messages to provided callback. Registering event returns UUID which can be used to later unsubscribe from the event. Library has also lower level methods for sending raw requests without events.

Events are

### LOCATION_UPDATE

Contains only the coordinates of tags.

```javascript
await channel.registerLocationUpdate(
    callback,
    1, // Account
    1, // Site
    null // Array of tag device serial numbers or null.
);

// Same as:
await channel.register(
    Ncc.EVENT_TYPES["LOCATION_UPDATE"],
    1, // Account
    1, // Site
    { deviceIds: [...]} // Filters
    callback // Callback
);

/* Message
{
    "123": { // Indexed by serial number.
        "x": 123, // X
        "y": 123,// Y
        "floor": 123 // Floor ID
    }
}
*/
```

### TAG_STATE

Tag's full state, including sensor values, timestamps and other state properties. Returns a single message after registering and then again when connection is re-established.

```javascript
await channel.registerInitialTagState(
    callback,
    1, // Account
    1, // Site
    null // Array of tag device serial numbers or null.
);

// Check PDF document for message schema.
```

### TAG_DIFF

Incremental updates to tag's full state. Includes only changed properties and isOnline flag to indicate the tag is connected. Use these to update the TAG_STATE result.

```javascript
await channel.registerTagDiffStream(
    callback,
    1, // Account
    1, // Site
    null // Array of tag device serial numbers or null.
);

/*
    "tags": {
        "123": { // Indexed by serial number.
            "isOnline": true, // Just indicates that the tag is alive.
            ... check the rest of the properties from PDF
        }
    },
    "removedTags": [ // Tags removed from site, most of the time null.
        123
    ]
*/
```

## Addresses

Below are listed default domains for integration with Noccela systems. These
are provided as defaults for library arguments, so using the directly is most
likely never necessary.

Domain for authentication server in _production_ environment is

```
https://auth.noccela.com
```

Base domain for APIs is (provided to library functions)

```
https://partner.noccela.com
```

## Known Issues

-   Backend has no notion of "request" or way of tracking them, they are concept of client
    library. This causes a bug that registering multiple events with same type and
    identical filters is possible and works, but when one of the is unregistered
    they are all removed from backend. This is why you should avoid creating multiple
    requests for same event type if possible.

## Todo

-   Rest of the WS API, like alert handling
-   Implement the HTTP API as its own functions
-   Full unit test coverage, currently only e2e tests exists
