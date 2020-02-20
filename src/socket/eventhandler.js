import "regenerator-runtime/runtime";
import { DEFAULT_OPTIONS, EVENT_TYPES } from "../constants/constants";
import { NCC_PATHS } from "../constants/paths";
import {
    uuidv4,
    validateAccountAndSite,
    validateOptions,
    waitAsync
} from "../utils/utils";
import { RobustAuthenticatedWSChannel } from "./connectionhandler";
import {
    getFilteredCallback,
    TagInitialStateFilter,
    LocationUpdateFilter,
    TagDiffStreamFilter
} from "./filters";
import { Dependencies, RegisteredEvent } from "./models";

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
     * @param {string} domain Domain for the backend.
     * @param {import("../constants/constants").GlobalOptions} [userOptions={}]
     * User-provided options that override defaults.
     * @memberof EventChannel
     * @preserve
     */
    constructor(domain, userOptions = {}) {
        // Build the complete WS endpoint address.
        /** @type {string} */
        const address = new URL(NCC_PATHS["REALTIME_API"], domain).href;

        // Combine default options with provided ones.
        /** @type {import("../constants/constants").GlobalOptions} */
        const options = Object.assign(DEFAULT_OPTIONS, userOptions);
        this._options = options;

        // Create logger functions that call all registered loggers.
        /** @type {import("../constants/constants").Logger} */
        const logger = {
            log: (...objs) => options.loggers.forEach(l => l?.log(...objs)),
            warn: (...objs) => options.loggers.forEach(l => l?.warn(...objs)),
            error: (...objs) => options.loggers.forEach(l => l?.error(...objs)),
            exception: (...objs) =>
                options.loggers.forEach(l => l?.exception(...objs)),
            debug: (...objs) => options.loggers.forEach(l => l?.debug(...objs))
        };
        this._logger = logger;

        // Registered events mapped by their id.
        /** @type {Object.<String, RegisteredEvent>} */
        this._registeredEvents = {};

        // Root-level dependency container that can be injected further.
        this._dependencyContainer = new Dependencies({
            logger: logger
        });

        // TODO: Web workers.
        // let useWebWorker = false;
        // if (userOptions.useWebWorkers) {
        //     if (typeof (window !== undefined) && window.Worker) {
        //         useWebWorker = true;
        //     } else {
        //         logger.debug("Cannot use web worker in current environment");
        //     }
        // }

        this._connection = new RobustAuthenticatedWSChannel(
            address,
            this._options,
            this._dependencyContainer
        );

        this._connection.setOnReconnectCallback(
            this._reregisterEvents.bind(this)
        );
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
                // @ts-ignore
                await this.register(...args);
            } catch (e) {
                this._logger.exception(
                    `Error while re-registering event ${eventType}`,
                    e
                );

                oldEventData.failedAttempts++;
                const maxFailedAttempts = this._options
                    .registrationAttemptsUntilIgnored;
                if (
                    !maxFailedAttempts ||
                    oldEventData.failedAttempts <=
                        this._options.registrationAttemptsUntilIgnored
                ) {
                    // Add a little delay in case socket is broken so it might be
                    // resolved the next time we try. Otherwise we might loop quickly
                    // and almost immediately ditch the event.
                    await waitAsync(this._options.waitForFailedReRegistration);

                    // Push the same entry to the back of the array so it will be attempted again.
                    oldEntries.push(oldEventData);
                } else {
                    this._logger.error(
                        `Failed to re-register ${eventType} ${oldEventData.failedAttempts} times, giving up`
                    );
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
     * @param {string} authServerDomain Authentication server domain.
     * @param {number} clientId Client ID to authenticate with.
     * @param {string} clientSecret Client secret.
     * @returns {Promise} Promise that resolves when connection is established.
     * @memberof EventChannel
     * @preserve
     */
    async connectPersistent(authServerDomain, clientId, clientSecret) {
        return this._connection.createAuthenticatedConnection(
            authServerDomain,
            clientId,
            clientSecret
        );
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
     * Register to live updates for tags' locations ona given site.
     *
     * This is a lightweight event and the most correct to use when only
     * location of the tags is concerned as it avoid unnecessary use of
     * bandwidth.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number} account
     * @param {Number} site
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerLocationUpdate(callback, account, site, deviceIds = null) {
        return this.register(
            EVENT_TYPES["LOCATION_UPDATE"],
            account,
            site,
            {
                deviceIds
            },
            callback
        );
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
     * @param {Number} account
     * @param {Number} site
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerInitialTagState(callback, account, site, deviceIds = null) {
        return this.register(
            EVENT_TYPES["TAG_STATE"],
            account,
            site,
            {
                deviceIds
            },
            callback
        );
    }

    /**
     * Register to incremental updates for tags' state on a given site.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number} account
     * @param {Number} site
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    async registerTagDiffStream(callback, account, site, deviceIds = null) {
        return this.register(
            EVENT_TYPES["TAG_DIFF"],
            account,
            site,
            {
                deviceIds
            },
            callback
        );
    }

    /**
     * Register to an API event, such as location update and tag metadata streams.
     * Provide filters for site and request-specific filters and a callback to
     * be invoked with response filtered with the provided filters.
     *
     * @param {string} eventType Type of the event to be registered.
     * @param {number} account Account id for the site.
     * @param {number} site Site id for the site.
     * @param {Object} filters Request specific filters for request.
     * @param {(err: String, payload: Object) => void} callback Callback
     * when a filtered message is received.
     * @returns {Promise} Promise that resolves or rejects when backend verifies
     * or rejects the registration.
     * @memberof EventChannel
     * @preserve
     */
    async register(eventType, account, site, filters, callback) {
        this._validateConnection();
        validateAccountAndSite(account, site);

        // Create UUID to track event and request.
        const uuid = uuidv4();
        // The type of the server response message, need to track this
        // to later unregister it.
        let registeredResponseType = null;
        let unregisterRequest = null;

        // Set default filter object.
        filters = filters || {};

        const combinedFilters = {
            ...filters,
            account,
            site
        };

        switch (eventType) {
            case EVENT_TYPES["LOCATION_UPDATE"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "locationUpdate";

                const filteredLocationUpdateCallback = getFilteredCallback(
                    LocationUpdateFilter,
                    callback,
                    combinedFilters,
                    this._dependencyContainer
                );

                this._connection.registerServerCallback(
                    registeredResponseType,
                    uuid,
                    filteredLocationUpdateCallback
                );

                const locationUpdateRequest = {
                    accountId: account,
                    siteId: site,
                    action: "registerTagLocation",
                    payload: filters
                };

                await this._connection.sendRequest(uuid, locationUpdateRequest);
                unregisterRequest = {
                    ...locationUpdateRequest,
                    action: "unregisterTagLocation"
                };

                break;
            case EVENT_TYPES["TAG_DIFF"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "tagDiffStream";

                const filteredTagDiffCallback = getFilteredCallback(
                    TagDiffStreamFilter,
                    callback,
                    combinedFilters,
                    this._dependencyContainer
                );

                this._connection.registerServerCallback(
                    registeredResponseType,
                    uuid,
                    filteredTagDiffCallback
                );

                const tagChangeRequest = {
                    accountId: account,
                    siteId: site,
                    action: "registerTagDiffStream",
                    payload: filters
                };
                await this._connection.sendRequest(uuid, tagChangeRequest);
                unregisterRequest = {
                    ...tagChangeRequest,
                    action: "unregisterTagDiffStream"
                };

                break;
            case EVENT_TYPES["TAG_STATE"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "initialTagState";

                const initialResponse = await this.getTagState(
                    account,
                    site,
                    filters["deviceIds"]
                );

                // Register to future tag state messages.
                // New is sent when for example socket is re-established.
                registeredResponseType = "initialTagState";

                callback(null, initialResponse);

                break;
            default:
                throw Error(
                    `Invalid event type ${eventType}, available types ${Object.keys(
                        EVENT_TYPES
                    ).join()}`
                );
        }

        this._logger.log(`Registered event ${eventType}`);

        // TODO: Do away with this in backend! Should be valid to have two
        // identical events registered.
        {
            // Warn if user creates two events with identical filters,
            // because of how backend does filtering unregistering removes
            // all events with that filter.
            const filtersSerialized = JSON.stringify(filters);
            const identicalEntries = Object.entries(this._registeredEvents)
                .filter(
                    ([_, values]) =>
                        values.eventType === eventType &&
                        JSON.stringify(values.args[3]) === filtersSerialized
                )
                .map(([uuid, _]) => uuid);

            if (identicalEntries && identicalEntries.length) {
                this._logger.warn(
                    `Multiple events with identical types and filters added! ` +
                        `Currently if one of these is unregistered they are all ` +
                        `unregisted! Events: ${JSON.stringify(
                            identicalEntries
                        )}`
                );
            }
        }

        // Track the event so it can be unregistered or re-registered if socket
        // is re-established.
        this._registeredEvents[uuid] = new RegisteredEvent(
            eventType,
            registeredResponseType,
            callback,
            [eventType, account, site, filters, callback],
            unregisterRequest
        );

        return uuid;
    }

    /**
     * Fetch initial state for tags on the site.
     *
     * @param {number} account Site's account id.
     * @param {number} site Site's id.
     * @memberof EventChannel
     * @preserve
     */
    async getTagState(account, site, deviceIds = null) {
        this._validateConnection();
        validateAccountAndSite(account, site);

        const payload = await this._connection.sendRequest(
            "getInitialTagState",
            {
                accountId: account,
                siteId: site,
                action: "initialTagState",
                payload: {
                    deviceIds
                }
            },
            null,
            "initialTagState"
        );

        // Parse the encoded message.
        const filter = new TagInitialStateFilter({
            account,
            site,
            deviceIds
        });
        return filter.filter(payload);
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
        /** @type { RegisteredEvent } */
        const event = this._registeredEvents[uuid];
        if (!event) return false;

        const eventType = event.eventType;
        const responseType = event.responseType;
        const unregisterRequest = event.unregisterRequest;

        if (unregisterRequest) {
            // Send an unregistration request to backend.
            if (this._connection) {
                const unregistrationUuid = uuidv4();
                if (this._connection.connected) {
                    await this._connection.sendRequest(
                        unregistrationUuid,
                        unregisterRequest
                    );
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
     * @param {number} account Account id for requested site.
     * @param {number} site Site id for requested site.
     * @param {Object} payload Request payload object.
     * @memberof EventChannel
     * @preserve
     */
    async sendMessageRaw(action, account, site, payload) {
        return await this._connection.sendMessageRaw(
            action,
            account,
            site,
            payload
        );
    }

    // Validate connection and throw for invalid state to prevent acting on
    // failed socket.
    _validateConnection() {
        if (!this._connection.connected) {
            throw Error("Authenticated connection does not exists");
        }
    }
}
