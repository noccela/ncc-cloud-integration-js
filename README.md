# Noccela JS SDK

JavaScript library that provides methods to communicate with Noccela cloud partner APIs using JavaScript.

## Overview

Noccela cloud provides various third party APIs for retrieving historical information and to receive real-time events from installed locations. Historical data is mainly retrieved using REST APIs and real-time communication happens through WebSockets. Both are implemented and wrapped in this library.

Clients are authenticated using JWT token, sent either as _Bearer_ token in _Authorize_ HTTP header or through WebSocket. This is requested from OAuth2 authentication server using _client credentials_ flow. The client id and secret are received when partner registers third party application in _Partner portal_.

Domain for authentication server in _production_ environment is

```
https://auth.noccela.com
```

Base domain for APIs is (provided to library functions)

```
https://partner.noccela.com
```

This library hides all complexity from WS communication protocol and provides easy Promise-based implementations to register to events and filter responses.

Library also handles broken connections, re-authentication and re-registration of events in case of socket failing.

Currently there are three types of high-level _events_.

```
LOCATION_UPDATE -> real-time updates to tag locations (coordinates)
TAG_STATE -> initial tag state, retrieved only once (or after reconnecting)
TAG_DIFF -> updates to tags' state, same data as in initial state but only changed values
```

## Installation

The library is packaged as UMD (Universal Module Definition), meaning it can be used in all environments.

Minified build result is in _/dist/main.min.js_.

Browser:

```html
<script src="./main.min.js"></script>
```

CommonJS (Node)

```javascript
const NccIntegration = require("./main.min.js");
```

ES module (not ready yet)

```javascript
import Ncc from "ncc-integration";
```

## Examples

Authenticate, create connection and connect to server.

```javascript
// Authenticate and receive access token.
const {
    accessToken, // JWT token.
    expiresIn // Expiration in seconds.
} = await NccIntegration.authentication.getToken(
    **AUTH SERVER DOMAIN**,
    **CLIENT ID**,
    **CLIENT SECRET**
);

// Create NCC websocket object.
const conn = NccIntegration.realTime.createWSChannel(
    **API DOMAIN**
);

// Connect to Noccela Cloud.
await ncc.connect(accessToken);
```

Subscribe to location updates. Other events work exactly the same but callbacks receive different information.

```javascript
// Create callback.
// Callbacks use Node-convention, in which errors are
// the first argument and arguments the second!
const callback = (err, payload) => {
    // Iterate the location updates, there might be multiple!
    for (const locationUpdate of payload) {
        const { deviceId, x, y, z } = locationUpdate;

        // ...
    }
};

// Register the callback with the previously created
// connection object.
// This sends the registration message to server
// and resolves if everything was ok.
await conn.register(
    NccIntegration.realTime.EVENT_TYPES["LOCATION_UPDATE"],
    1, // Account.
    1, // Site.
    { deviceIds: [1000500916] }, // Additional filters, like device ids. Not mandatory!
    callback // User provided callback.
);
```

## Todo

-   Filtering to TAG_DIFF
-   Functions for entire REST API
-   Provide way to install as package dependency via npm
