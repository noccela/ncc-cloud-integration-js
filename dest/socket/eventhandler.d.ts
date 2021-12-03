import { RobustAuthenticatedWSChannel } from "./connectionhandler.js";
import { Dependencies, RegisteredEvent } from "./models.js";
import * as Types from "../types.js";
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
export declare class EventChannel {
    _options: Types.UserOptions;
    _origin: string;
    _logger: Types.ConsoleLogger;
    _registeredEvents: Record<string, RegisteredEvent>;
    _dependencyContainer: Dependencies;
    _connection: RobustAuthenticatedWSChannel;
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
    constructor(account: number, site: number, userOptions?: Types.UserOptions | null, httpOrigin?: string);
    _reregisterEvents(): Promise<void>;
    /**
     * Create connection to Noccela cloud and authenticate the connection.
     *
     * @param {string} jwt JWT token received from authentication server.
     * @memberof EventChannel
     * @preserve
     */
    connect(jwt: string): Promise<void>;
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
    connectPersistent(getToken: (domain: string) => Promise<string>, authServerDomain?: string): Promise<void>;
    /**
     * Close connection.
     *
     * @memberof EventChannel
     * @returns {Promise} Promise that resolves when socket is successfully
     * closed.
     * @preserve
     */
    close(): Promise<void>;
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
    registerLocationUpdate(callback: (payload: Types.LocationUpdateResponse) => void, deviceIds?: number[] | null): Promise<string>;
    /**
     * Register to live P2P distance stream.
     *
     * This is an event to to get live P2P distances
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    registerP2PDistanceStream(callback: (payload: Types.P2PDistanceUpdateResponse) => void, deviceIds?: number[] | null): Promise<string>;
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
    registerInitialTagState(callback: (payload: Types.TagInitialStateResponse) => void, deviceIds?: number[] | null): Promise<string>;
    /**
     * Register to incremental updates for tags' state on a given site.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {Number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    registerTagDiffStream(callback: (payload: Types.TagDiffResponse) => void, deviceIds?: number[] | null): Promise<string>;
    /**
     * Register to contact tracing updates.
     *
     * @param {(err: String, payload: Object) => void} callback
     * @param {number[]} [deviceIds] Devices to get updates for. If null then
     * all devides from the site.
     */
    registerContactTracingUpdate(callback: (payload: Types.ContactTracingUpdateResponse) => void, deviceIds?: number[] | null): Promise<string>;
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
    registerTwrStream(callback: (payload: Types.TwrDataResponse) => void, tagDeviceIds?: number[] | null, beaconDeviceIds?: number[] | null): Promise<string>;
    /**
    * Register to site information.
    *
    * The callback will be invoked when first registered and when the connection
    * is re-established.
    *
    * @param {(err: String, payload: Object) => void} callback
    */
    registerSiteInformation(callback: (payload: Types.SiteInformationResponse) => void): Promise<string>;
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
    register(eventType: string, filters: Types.MessageFilter, callback: (payload: object) => void, requestUuid?: string | null): Promise<string>;
    /**
     * Fetch initial state for tags on the site.
     *
     * @memberof EventChannel
     * @preserve
     */
    getTagState(deviceIds?: number[] | null): Promise<Types.TagInitialStateResponse | null>;
    /**
     * Fetch initial state for tags on the site.
     *
     * @memberof EventChannel
     * @preserve
     */
    getSite(): Promise<Types.CloudResponse | undefined>;
    /**
     * @param {{ deviceIds?: number[], start: number, stop?: number }} options
     */
    getContactTracingHistory({ deviceIds, start, stop }?: {
        start: number;
        deviceIds?: null | undefined;
        stop?: null | undefined;
    }): Promise<Types.CloudResponse | undefined>;
    /**
     * Unregister an event registered with 'register()'. The UUID provided
     * is the one returned by register function.
     *
     * @param {string} uuid UUID for the registered event.
     * @memberof EventChannel
     * @preserve
     */
    unregister(uuid: string): Promise<boolean>;
    /**
     * Send a raw request to cloud.
     *
     * @param {string} action Request type.
     * @param {Object} payload Request payload object.
     * @memberof EventChannel
     * @preserve
     */
    sendMessageRaw(action: string, payload: Types.Request): Promise<Types.CloudResponse>;
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
    registerToServerMessageRaw(action: string, callback: (payload: object) => void): string;
    /**
     * Directly remove a listener from socket, registered with
     * registerToServerMessageRaw.
     *
     * @param {string} action Action the callback is registered to.
     * @param {string} uuid Unique ID of the callback, returned when registering.
     */
    unregisterServerMessageRaw(action: string, uuid: string): void;
    get connected(): boolean;
    _validateConnection(): void;
}
