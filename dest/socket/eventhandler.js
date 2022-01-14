import { DEFAULT_OPTIONS, EVENT_TYPES } from "../constants/constants.js";
import { DEFAULT_AUTH_ORIGIN, DEFAULT_API_HTTP_ORIGIN, } from "../constants/paths.js";
import { getUniqueId, validateAccountAndSite, validateOptions, waitAsync, } from "../utils/utils.js";
import { RobustAuthenticatedWSChannel } from "./connectionhandler.js";
import { getFilteredCallback, TagInitialStateFilter, AlertInitialStateFilter, LocationUpdateFilter, P2pDistanceUpdateFilter, TagDiffStreamFilter, TwrDataFilter, ContactTracingUpdateFilter, AlertDiffStreamFilter, } from "./filters.js";
import { Dependencies, RegisteredEvent } from "./models.js";
import { ArgumentException } from "../utils/exceptions.js";
/**
 * Class that encloses a connection to Noccela's backend and provides high-level
 * methods that enable registering to events and sending requests.
 *
 * Manages the internal state of the session and handles re-opening broken connections
 * and re-establishing session.
 *
 * @export
 * @class EventChannel
 * @preserve
 */
export class EventChannel {
    /**
     * Creates an instance of EventChannel.
     *
     * @param {number} account Site's account.
     * @param {number} site Site's ID.
     * @param {import("../constants/constants").GlobalOptions} [userOptions={}]
     * User-provided options that override defaults.
     * @param {string} httpOrigin Origin for the backend. Includes protocol
     * but no path.
     * @memberof EventChannel
     * @preserve
     */
    constructor(account, site, userOptions = null, httpOrigin = DEFAULT_API_HTTP_ORIGIN) {
        validateAccountAndSite(account, site);
        // Combine default options with provided ones.
        /** @type {import("../constants/constants").GlobalOptions} */
        const options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), userOptions);
        this._options = options;
        this._origin = httpOrigin;
        // Create logger functions that call all registered loggers.
        /** @type {import("../constants/constants").Logger} */
        const logger = {
            log: (msg) => options.loggers.forEach((l) => l && l.log(msg)),
            warn: (msg) => options.loggers.forEach((l) => l && l.warn(msg)),
            error: (msg) => options.loggers.forEach((l) => l && l.error(msg)),
            exception: (msg) => options.loggers.forEach((l) => l && l.exception(msg, null)),
            debug: (msg) => options.loggers.forEach((l) => l && l.debug(msg, null)),
        };
        this._logger = logger;
        // Registered events mapped by their id.
        /** @type {Object.<String, RegisteredEvent>} */
        this._registeredEvents = {};
        // Root-level dependency container that can be injected further.
        this._dependencyContainer = new Dependencies(logger);
        this._connection = new RobustAuthenticatedWSChannel(this._origin, account, site, this._options, this._dependencyContainer);
        this._connection.setOnReconnectCallback(this._reregisterEvents.bind(this));
    }
    // Handle event re-registration after broken connection is fixed.
    async _reregisterEvents() {
        // Get events to be registered with new connection.
        const oldEntries = Object.values(this._registeredEvents);
        // Remove old registrations.
        this._registeredEvents = {};
        for (const oldEventData of oldEntries) {
            const { eventType, args } = oldEventData;
            try {
                // Register the event using same arguments as before.
                // This also includes the previous UUID that is used instead
                // of generating new one so that the new event has the same ID.
                // @ts-ignore
                await this.register(...args);
            }
            catch (e) {
                this._logger.exception(`Error while re-registering event ${eventType}`, e.toString());
                oldEventData.failedAttempts++;
                const maxFailedAttempts = this._options
                    .registrationAttemptsUntilIgnored;
                if (!maxFailedAttempts ||
                    oldEventData.failedAttempts <=
                        this._options.registrationAttemptsUntilIgnored) {
                    // Add a little delay in case socket is broken so it might be
                    // resolved the next time we try. Otherwise we might loop quickly
                    // and almost immediately ditch the event.
                    await waitAsync(this._options.waitForFailedReRegistration);
                    // Push the same entry to the back of the array so it will be attempted again.
                    oldEntries.push(oldEventData);
                }
                else {
                    this._logger.error(`Failed to re-register ${eventType} ${oldEventData.failedAttempts} times, giving up`);
                }
            }
        }
    }
    /**
     * Create connection to Noccela cloud and authenticate the connection.
     *
     * @param {string} jwt JWT token received from authentication server.
     * @memberof EventChannel
     * @preserve
     */
    async connect(jwt) {
        await this._connection.connect(jwt);
    }
    /**
     * Fetch new token from authentication server and connect the WebSocket in
     * one go. Also automatically schedules new token retrieval if 'automaticTokenRenewal'
     * is true in options.
     *
     * @param {() => Promise<string>} getToken Async callback that fetches the
     * access token.
     * @param {string} authServerDomain Authentication server domain.
     * @returns {Promise} Promise that resolves when connection is established.
     * @memberof EventChannel
     * @preserve
     */
    async connectPersistent(getToken, authServerDomain = DEFAULT_AUTH_ORIGIN) {
        return this._connection.createAuthenticatedConnection(authServerDomain, getToken);
    }
    /**
     * Close connection.
     *
     * @memberof EventChannel
     * @returns {Promise} Promise that resolves when socket is successfully
     * closed.
     * @preserve
     */
    async close() {
        await this._connection.close();
        this._registeredEvents = {};
    }
    /**
     * Register to live updates for tags' locations on a given site.
     *
     * This is a lightweight event and the most correct to use when only
     * location of the tags is concerned as it avoid unnecessary use of
     * bandwidth.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerLocationUpdate(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["LOCATION_UPDATE"], filter, callback);
    }
    /**
     * Register to live P2P distance stream.
     *
     * This is an event to to get live P2P distances
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerP2PDistanceStream(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["P2P_DISTANCE_UPDATE"], filter, callback);
    }
    /**
     * Register to initial full state for tags on a given site.
     *
     * The callback will be invoked when first registered and when the connection
     * is re-established. Otherwise updates are tracked via incremental updates.
     *
     * To get the full state whenever you want, use @see{EventChannel#getTagState}.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerInitialTagState(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["TAG_STATE"], filter, callback);
    }
    /**
     * Register to incremental updates for tags' state on a given site.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerTagDiffStream(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["TAG_DIFF"], filter, callback);
    }
    async registerInitialAlertState(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["ALERT_STATE"], filter, callback);
    }
    async registerAlertDiffStream(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["ALERT_DIFF"], filter, callback);
    }
    /**
     * Register to contact tracing updates.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerContactTracingUpdate(callback, deviceIds = null) {
        if (deviceIds && deviceIds.constructor !== Array) {
            throw new ArgumentException("deviceIds");
        }
        const filter = {
            deviceIds: deviceIds
        };
        return this.register(EVENT_TYPES["CONTACT_TRACE_UPDATE"], filter, callback);
    }
    /**
     * Register to live updates on raw data for TWR measurements.
     * This data includes:
     *  - Measured distance from beacon to tag in millimeters.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [tagDeviceIds] Tag devices to get updates for. Null
     * for all tag devices.
     * @param {Number[]} [beaconDeviceIds] Beacon devices to get measurements
     * from. Null for all beacons.
     */
    async registerTwrStream(callback, tagDeviceIds = null, beaconDeviceIds = null) {
        if (tagDeviceIds && tagDeviceIds.constructor !== Array) {
            throw new ArgumentException("tagDeviceIds");
        }
        if (beaconDeviceIds && beaconDeviceIds.constructor !== Array) {
            throw new ArgumentException("beaconDeviceIds");
        }
        const twrFilter = {
            deviceIds: null,
            tagDeviceIds: tagDeviceIds,
            beaconDeviceIds: beaconDeviceIds
        };
        return this.register(EVENT_TYPES["TWR_DATA"], twrFilter, callback);
    }
    /**
    * Register to site information.
    *
    * The callback will be invoked when first registered and when the connection
    * is re-established.
    *
    * @param {(err: String, payload: Object) => void} callback
    */
    async registerSiteInformation(callback) {
        const filter = {
            deviceIds: null
        };
        return this.register(EVENT_TYPES["SITE_INFO"], filter, callback);
    }
    /**
     * Register to an API event, such as location update and tag metadata streams.
     * Provide filters for site and request-specific filters and a callback to
     * be invoked with response filtered with the provided filters.
     *
     * @param {string} eventType Type of the event to be registered.
     * @param {Object} filters Request specific filters for request.
     * @param {(err: String, payload: Object) => void} callback Callback
     * when a filtered message is received.
     * @param {string} requestUuid The unique ID to use to track the request.
     * If null then a new one is generated.
     * @returns {Promise} Promise that resolves or rejects when backend verifies
     * or rejects the registration.
     * @memberof EventChannel
     * @preserve
     */
    async register(eventType, filters, callback, requestUuid = null) {
        this._validateConnection();
        // Create UUID to track event and request or use provided one.
        const uuid = requestUuid || getUniqueId();
        let regRequest = {
            eventType: eventType,
            filter: filters,
            callback: callback,
            uuid: uuid
        };
        // The type of the server response message, need to track this
        // to later unregister it.
        let registeredResponseType = null;
        let unregisterRequest = null;
        // Set default filter object.
        regRequest.filter = regRequest.filter || { deviceIds: null };
        switch (regRequest.eventType) {
            case EVENT_TYPES["LOCATION_UPDATE"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "locationUpdate";
                    const filteredLocationUpdateCallback = getFilteredCallback(LocationUpdateFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredLocationUpdateCallback.process.bind(filteredLocationUpdateCallback));
                    const locationUpdateRequest = {
                        uniqueId: uuid,
                        action: "registerTagLocation",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(locationUpdateRequest);
                    unregisterRequest = Object.assign(Object.assign({}, locationUpdateRequest), { action: "unregisterTagLocation" });
                }
                break;
            case EVENT_TYPES["P2P_DISTANCE_UPDATE"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "p2pDistanceUpdate";
                    const filteredP2pDistanceUpdateCallback = getFilteredCallback(P2pDistanceUpdateFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredP2pDistanceUpdateCallback.process.bind(filteredP2pDistanceUpdateCallback));
                    const p2pDistanceUpdateRequest = {
                        uniqueId: uuid,
                        action: "registerP2PDistanceStream",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(p2pDistanceUpdateRequest);
                    unregisterRequest = Object.assign(Object.assign({}, p2pDistanceUpdateRequest), { action: "unregisterP2PDistanceStream" });
                }
                break;
            case EVENT_TYPES["TAG_DIFF"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "tagDiffStream";
                    const filteredTagDiffCallback = getFilteredCallback(TagDiffStreamFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredTagDiffCallback.process.bind(filteredTagDiffCallback));
                    const tagChangeRequest = {
                        uniqueId: uuid,
                        action: "registerTagDiffStream",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(tagChangeRequest);
                    unregisterRequest = Object.assign(Object.assign({}, tagChangeRequest), { action: "unregisterTagDiffStream" });
                }
                break;
            case EVENT_TYPES["ALERT_DIFF"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "alertDiffStream";
                    const filteredAlertDiffCallback = getFilteredCallback(AlertDiffStreamFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredAlertDiffCallback.process.bind(filteredAlertDiffCallback));
                    const alertChangeRequest = {
                        uniqueId: uuid,
                        action: "registerAlertDiffStream",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(alertChangeRequest);
                    unregisterRequest = Object.assign(Object.assign({}, alertChangeRequest), { action: "unregisterAlertDiffStream" });
                }
                break;
            case EVENT_TYPES["TWR_DATA"]:
                {
                    validateOptions(regRequest.filter, ["tagDeviceIds", "beaconDeviceIds"], null);
                    registeredResponseType = "twrStreamData";
                    const filteredCallback = getFilteredCallback(TwrDataFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredCallback.process.bind(filteredCallback));
                    const request = {
                        uniqueId: uuid,
                        action: "registerTwrStream",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(request);
                    unregisterRequest = Object.assign(Object.assign({}, request), { action: "unregisterTwrStream" });
                }
                break;
            case EVENT_TYPES["CONTACT_TRACE_UPDATE"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], // TODO: Beacon serial number?
                    null);
                    registeredResponseType = "contactTracingUpdate";
                    const filteredCallback = getFilteredCallback(ContactTracingUpdateFilter, regRequest.callback, regRequest.filter, this._dependencyContainer);
                    this._connection.registerServerCallback(registeredResponseType, uuid, filteredCallback.process.bind(filteredCallback));
                    const request = {
                        uniqueId: uuid,
                        action: "registerContactTracingStream",
                        payload: regRequest.filter,
                    };
                    await this._connection.sendRequest(request);
                    unregisterRequest = Object.assign(Object.assign({}, request), { action: "unregisterContactTracingStream" });
                }
                break;
            case EVENT_TYPES["TAG_STATE"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "initialTagState";
                    const initialResponse = await this.getTagState(regRequest.filter.deviceIds);
                    // Register to future tag state messages.
                    // New is sent when for example socket is re-established.
                    registeredResponseType = "initialTagState";
                    if (initialResponse != null)
                        regRequest.callback(null, initialResponse);
                }
                break;
            case EVENT_TYPES["ALERT_STATE"]:
                {
                    validateOptions(regRequest.filter, ["deviceIds"], null);
                    registeredResponseType = "initialAlertState";
                    const initialResponse = await this.getAlertState(regRequest.filter.deviceIds);
                    // Register to future tag state messages.
                    // New is sent when for example socket is re-established.
                    registeredResponseType = "initialAlertState";
                    if (initialResponse != null)
                        regRequest.callback(null, initialResponse);
                }
                break;
            case EVENT_TYPES["SITE_INFO"]:
                {
                    registeredResponseType = "getSite";
                    const initialResponse = await this.getSite();
                    // Register to future tag state messages.
                    // New is sent when for example socket is re-established.
                    registeredResponseType = "getSite";
                    if (initialResponse != null) {
                        const response = initialResponse.payload;
                        regRequest.callback(null, response);
                    }
                }
                break;
            default:
                throw Error(`Invalid event type ${regRequest.eventType}, available types ${Object.keys(EVENT_TYPES).join()}`);
        }
        this._logger.log(`Registered event ${regRequest.eventType} with uuid ${uuid}`);
        // TODO: Do away with this in backend! Should be valid to have two
        // identical events registered.
        {
            // Warn if user creates two events with identical filters,
            // because of how backend does filtering unregistering removes
            // all events with that filter.
            const filtersSerialized = JSON.stringify(regRequest.filter);
            const identicalEntries = Object.entries(this._registeredEvents)
                .filter(([, values]) => values.eventType === regRequest.eventType &&
                JSON.stringify(values.args.filter) === filtersSerialized)
                .map(([uuid]) => uuid);
            if (identicalEntries && identicalEntries.length) {
                this._logger.warn("Multiple events with identical types and filters added! " +
                    "Currently if one of these is unregistered they are all " +
                    `unregisted! Events: ${JSON.stringify(identicalEntries)}`);
            }
        }
        // Track the event so it can be unregistered or re-registered if socket
        // is re-established.
        this._registeredEvents[uuid] = new RegisteredEvent(eventType, registeredResponseType, callback, regRequest, unregisterRequest);
        return uuid;
    }
    /**
     * Fetch initial state for tags on the site.
     *
     * @memberof EventChannel
     * @preserve
     */
    async getTagState(deviceIds = null) {
        this._validateConnection();
        const msg = {
            uniqueId: "getInitialTagState",
            action: "initialTagState",
            payload: {
                deviceIds
            }
        };
        const payload = await this._connection.sendRequest(msg, null, "initialTagState");
        if (payload == null)
            return null;
        // Parse the encoded message.
        const filter = new TagInitialStateFilter({
            deviceIds,
        });
        return filter.filter(payload);
    }
    /**
     * Fetch initial state for alerts on the site.
     *
     * @memberof EventChannel
     * @preserve
     */
    async getAlertState(deviceIds = null) {
        this._validateConnection();
        var tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
        const msg = {
            uniqueId: "getInitialAlertState",
            action: "initialAlertState",
            payload: {
                dateRanges: [{
                        start: tenDaysAgo.toISOString(),
                        end: new Date().toISOString()
                    }]
            }
        };
        const payload = await this._connection.sendRequest(msg, null, "initialAlertState");
        if (payload == null)
            return null;
        // Parse the encoded message.
        const filter = new AlertInitialStateFilter({
            deviceIds,
        });
        return filter.filter(payload);
    }
    /**
     * Fetch initial state for tags on the site.
     *
     * @memberof EventChannel
     * @preserve
     */
    async getSite() {
        this._validateConnection();
        const msg = {
            uniqueId: "getSite",
            action: "getSite",
            payload: {}
        };
        const payload = await this._connection.sendRequest(msg, null, "getSite");
        return payload;
    }
    /**
     * @param {{ deviceIds?: number[], start: number, stop?: number }} options
     */
    async getContactTracingHistory({ deviceIds = null, start, stop = null } = {
        start: Date.now() - 24 * 60 * 60 * 1000,
    }) {
        this._validateConnection();
        if (deviceIds && !Array.isArray(deviceIds))
            throw TypeError("Invalid deviceIds");
        if (!start)
            throw TypeError("Start is not provided");
        if (stop && !Number.isInteger(stop))
            throw TypeError("Invalid stop, must be integer");
        const msg = {
            uniqueId: getUniqueId(),
            action: "initialContactTracingState",
            payload: {
                deviceIds,
                start,
                stop,
            },
        };
        const payload = await this._connection.sendRequest(msg);
        return payload;
    }
    /**
     * Unregister an event registered with 'register()'. The UUID provided
     * is the one returned by register function.
     *
     * @param {string} uuid UUID for the registered event.
     * @memberof EventChannel
     * @preserve
     */
    async unregister(uuid) {
        const event = this._registeredEvents[uuid];
        if (!event)
            return false;
        const eventType = event.eventType;
        const responseType = event.responseType;
        const unregisterRequest = event.unregisterRequest;
        if (unregisterRequest) {
            // Send an unregistration request to backend.
            if (this._connection) {
                unregisterRequest.uniqueId = getUniqueId();
                if (this._connection.connected) {
                    await this._connection.sendRequest(unregisterRequest);
                }
            }
        }
        delete this._registeredEvents[uuid];
        // Unregister from handler, if it exists.
        // No handler means the socket is temporarily down, no need to
        // unregister from cloud as new connection will just not re-register it.
        if (this._connection) {
            this._connection.unregisterServerCallback(responseType, uuid);
        }
        this._logger.log(`Unregistered event ${eventType} with UUID ${uuid}`);
        return true;
    }
    /**
     * Send a raw request to cloud.
     *
     * @param {string} action Request type.
     * @param {Object} payload Request payload object.
     * @memberof EventChannel
     * @preserve
     */
    async sendMessageRaw(action, payload) {
        return await this._connection.sendMessageRaw(action, payload);
    }
    /**
     * Bind directly to the request handler and add a callback that will
     * be called with the raw message without filtering.
     *
     * This just taps into the socket, all state handling is bypassed.
     * If socket closes the listener is not re-registered automatically.
     *
     * @param {string} action Action of server sent message to bind to.
     * @param {(err: string, payload: object) => void} callback
     */
    registerToServerMessageRaw(action, callback) {
        const uuid = getUniqueId();
        this._connection.registerServerCallback(action, uuid, (payload) => 
        // For compability and future-proofing, use Node-convention here too.
        callback(payload));
        return uuid;
    }
    /**
     * Directly remove a listener from socket, registered with
     * registerToServerMessageRaw.
     *
     * @param {string} action Action the callback is registered to.
     * @param {string} uuid Unique ID of the callback, returned when registering.
     */
    unregisterServerMessageRaw(action, uuid) {
        this._connection.unregisterServerCallback(action, uuid);
    }
    get connected() {
        if (!this._connection)
            return false;
        return this._connection.connected;
    }
    // Validate connection and throw for invalid state to prevent acting on
    // failed socket.
    _validateConnection() {
        if (!this._connection.connected) {
            throw Error("Authenticated connection does not exists");
        }
    }
}
