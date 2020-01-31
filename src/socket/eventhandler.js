import "regenerator-runtime/runtime";

import { DEFAULT_OPTIONS, EVENT_TYPES } from "../constants/constants";
import {
    validateOptions,
    uuidv4,
    validateAccountAndSite
} from "../utils/utils";
import { NCC_PATHS } from "../constants/paths";

import {
    getFilteredCallback,
    LocationUpdateFilter,
    TagDiffStreamFilter,
    TagInitialStateFilter
} from "./filters";

import { Dependencies, RegisteredEvent } from "./models";

import { RobustAuthenticatedWSChannel } from "./connectionhandler";

/**
 * Create the connection object that is used to communicate with Noccela cloud.
 * Provides methods to connect, authenticate, send requests asynchronously and
 * custom events with filters.
 *
 * @param {String} address WebSocket endpoint address.
 * @param {Object?} userOptions User provided options object that overrides or supplements defaults.
 */
export class EventChannel {
    constructor(domain, userOptions = {}) {
        // Build the complete ws endpoint address.
        const address = new URL(NCC_PATHS["REALTIME_API"], domain).href;

        // Combine default options with provided ones.
        const options = Object.assign(DEFAULT_OPTIONS, userOptions);
        this._options = options;

        // Create logger functions that call all registered loggers.
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

        this._connection.setOnReconnectCallback(this._reregisterEvents);
    }

    // Handle event re-registration after broken connection is fixed.
    async _reregisterEvents() {
        // Re-register events.
        const oldEntries = Object.entries(registeredEvents);
        for (const [uuid, data] of oldEntries) {
            const { args } = data;

            // Remove old registrations.
            this._registeredEvents = {};

            try {
                // Register the event using same arguments as before.
                await this._register(...args);
            } catch (e) {
                // TODO: What should happen in this situation?
                this._logger.exception("Error while re-registering event", e);
            }
        }
    }

    /**
     * Create connection to Noccela cloud and authenticate the connection.
     *
     * @param {String} jwt JWT token received from authentication server.
     */
    async connect(jwt) {
        debugger;
        return this._connection.connect(jwt);
    }

    async connectAndAuthenticate(authServerDomain, clientId, clientSecret) {
        //debugger;
        return this._connection.authenticateAndConnect(
            authServerDomain,
            clientId,
            clientSecret
        );
    }

    /**
     * Fetch new token from authentication server and connect the WebSocket in
     * one go. Also automatically schedules new token retrieval if 'automaticTokenRenewal'
     * is true in options.
     *
     * @param {String} authServerDomain Authentication server domain.
     * @param {String} clientId Client ID to authenticate with.
     * @param {String} clientSecret Client secret.
     */
    async connectPersistent(authServerDomain, clientId, clientSecret) {
        return this._connection.authenticateAndConnect(
            authServerDomain,
            clientId,
            clientSecret
        );
    }

    /**
     * Close connection.
     */
    async close() {
        await this._connection.close();
        this._registeredEvents = {};
    }

    /**
     * Register to an API event, such as location update and tag metadata streams.
     * Provide filters for site and request-specific filters and a callback to
     * be invoked with response filtered with the provided filters.
     *
     * @param {String} type Type of the event to be registered.
     * @param {Number} account Account id for the site.
     * @param {Number} site Site id for the site.
     * @param {Object} filters Request specific filters for request.
     * @param {Function} callback Callback when a filtered message is received.
     */
    async register(type, account, site, filters, callback) {
        this._validateConnection();
        validateAccountAndSite(account, site);

        // Create UUID to track event and request.
        const uuid = uuidv4();
        // The type of the server response message, need to track this
        // to later unregister it.
        let registeredResponseType = null;
        let unregisterFromHandler = true;

        const combinedFilters = {
            ...filters,
            account,
            site
        };

        switch (type) {
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

                await this._connection.sendRequest(uuid, {
                    accountId: account,
                    siteId: site,
                    action: "tagLocationRequest",
                    payload: filters
                });
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
                await this._connection.sendRequest(uuid, {
                    accountId: account,
                    siteId: site,
                    action: "registerToTagChangeStream",
                    payload: filters
                });
                break;
            case EVENT_TYPES["TAG_STATE"]:
                validateOptions(filters, ["deviceIds"], null);
                registeredResponseType = "initialTagState";

                // This event has special handling.
                unregisterFromHandler = false;

                const initialResponse = await this.getTagState(
                    account,
                    site,
                    filters
                );

                // Register to future tag state messages.
                // New is sent when for example socket is re-established.
                registeredResponseType = "initialTagState";

                callback(null, initialResponse);
                break;
            default:
                throw Error(
                    `Invalid event type ${type}, available types ${Object.keys(
                        EVENT_TYPES
                    ).join()}`
                );
        }

        this._logger.log(`Registered event ${type}`);

        // Track the event so it can be unregistered or re-registered if socket
        // is re-established.
        this._registeredEvents[uuid] = new RegisteredEvent(
            type,
            registeredResponseType,
            callback,
            [type, account, site, filters, callback],
            unregisterFromHandler
        );

        return uuid;
    }

    /**
     * Fetch initial state for tags on the site.
     *
     * @param {Number} account Site's account id.
     * @param {Number} site Site's id.
     */
    async getTagState(account, site, filters = {}) {
        this._validateConnection();
        validateAccountAndSite(account, site);

        const payload = await this._connection.sendRequest(
            "getInitialTagState",
            {
                accountId: account,
                siteId: site,
                action: "getInitialTagState",
                payload: null
            },
            null,
            "initialTagState"
        );

        // Parse the encoded message.
        const filter = new TagInitialStateFilter({
            ...filters,
            account,
            site
        });

        return filter.filter(payload);
    }

    /**
     * Unregister an event registered with 'register()'. The UUID provided
     * is the one returned by register function.
     *
     * @param {String} uuid UUID for the registered event.
     */
    async unregister(uuid) {
        const event = this._registeredEvents[uuid];
        if (!event) return false;

        const type = event["responseType"];
        const eventType = event["eventType"];
        const unregisterFromHandler = event["unregisterFromHandler"];

        delete this._registeredEvents[uuid];

        if (unregisterFromHandler) {
            // Unregister from handler, if it exists.
            // No handler means the socket is temporarily down, no need to
            // unregister from cloud as new connection will just not re-register it.
            if (this._connection) {
                this._connection.unregisterServerCallback(type, uuid);
            }
        }
        this._logger.log(`Unregistered event ${eventType} with UUID ${uuid}`);

        return true;
    }

    /**
     * Send a raw request to cloud.
     *
     * @param {String} action Request type.
     * @param {Number} account Account id for requested site.
     * @param {Number} site Site id for requested site.
     * @param {Object} payload Request payload object.
     */
    async sendMessageRaw(action, account, site, payload) {
        return await this._connection.sendMessageRaw(
            action,
            account,
            site,
            payload
        );
    }

    _validateConnection() {
        if (!this._connection.connected) {
            throw Error("Authenticated connection does not exists");
        }
    }
}
