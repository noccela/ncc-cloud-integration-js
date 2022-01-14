export declare type AuthenticateResult = {
    tokenExpiration: number;
    tokenIssued: number;
};
export declare type TokenRefreshRequest = {
    authServerDomain: string;
    tokenExpiration: number;
    tokenIssued: number;
    getToken: (clientId: number, clientSecret: string, authOrigin: string) => Promise<AuthResult>;
};
export declare type ConsoleLogger = {
    log: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
    exception: (msg: string, e: string | null) => void;
    debug: (msg: string, b: any) => void;
};
export declare type UserOptions = {
    loggers: [ConsoleLogger];
    reopenBrokenConnection: boolean;
    retryIntervalMin: number;
    retryIntervalMax: number;
    retryIntervalIncrease: number;
    logRawMessages: boolean;
    onMessage: (() => void) | null;
    onClose: (() => void) | null;
    onError: (() => void) | null;
    onConnect: (() => void) | null;
    processMessages: true;
    requestTimeout: number;
    automaticTokenRenewal: boolean;
    tokenRefreshFailureRetryTimeout: number;
    registrationAttemptsUntilIgnored: number;
    waitForFailedReRegistration: number;
    getWsAddress: ((lbDomain: string, account: number, site: number, token: string) => Promise<string>) | null;
};
export declare type Request = {
    uniqueId: string;
    action: string;
    payload: object;
};
export declare type CloudResponse = {
    uniqueId: string;
    action: string | null;
    status: string;
    payload: any;
};
export declare type AuthResponse = {
    expires_in: number;
    access_token: string;
    error: string;
};
export declare type AuthResult = {
    expiresIn: number;
    accessToken: string;
};
export declare type AuthenticateResponse = {
    tokenExpiration: number;
    tokenIssued: number;
    cloudVersion: string;
};
export interface LocationUpdateResponse extends Dictionary<LocationUpdateItem> {
}
export declare type LocationUpdateItem = {
    timestamp: number;
    twrTimestamp?: number;
    x: number;
    y: number;
    floorId?: number;
};
export declare type NodeDomainResponse = {
    domain: string;
};
interface Dictionary<T> extends Object {
    [key: number]: T;
}
export interface TagInitialStateResponse extends Dictionary<InitialTagState> {
}
export declare type InitialTagState = {
    name: string;
    batteryVoltage: number;
    batteryStatus: number;
    status: number;
    areas: number[];
    wire: boolean;
    reed: boolean;
    isOnline: boolean;
    timestamp: Date;
    x: number;
    y: number;
    accelerometer: boolean;
    floorId: number;
    signalLost: boolean;
    powerSave: boolean;
    deviceModel: string;
    fwVersion: string;
    strokeCount: number;
};
export interface AlertInitialStateResponse extends Dictionary<Alert> {
}
export declare type Alert = {
    alarmId: number;
    deviceId: number;
    alarmType: string;
    x: number;
    y: number;
    timestamp: string;
    floorId: number | null;
    areaNames: string[];
};
interface AlertDiffAlerts extends Dictionary<Alert> {
}
export declare type AlertDiffResponse = {
    alerts: AlertDiffAlerts | null;
    removedAlerts: number[] | null;
};
interface TagDiffTags extends Dictionary<TagDiffItem> {
}
export declare type TagDiffItem = {
    name: string;
    batteryStatus: number;
    status: number;
    areas: number[];
    isOnline: boolean;
    x: number;
    y: number;
    floorId: number;
    signalLost: boolean;
    powerSave: boolean;
    fwVersion: string;
    timestamp: number;
    strokeCount: number;
};
export declare type TagDiffResponse = {
    tags: TagDiffTags | null;
    removedTags: string[] | null;
};
export declare type TwrDataResponse = {
    tId: number;
    bId: number;
    t: number;
    d: number;
};
export interface MessageFilter {
    deviceIds: number[] | null;
}
export interface TwrDataFilter extends MessageFilter {
    tagDeviceIds: number[] | null;
    beaconDeviceIds: number[] | null;
}
export interface P2PDistanceUpdateResponse extends Array<P2PDistanceUpdateItem> {
}
export interface P2PDistanceUpdateItem {
    tag1: number;
    tag2: number;
    beacon: number;
    distance: number;
    timestamp: number;
}
export interface ContactTracingUpdateResponse extends Array<ContactTracingUpdateItem> {
}
export interface ContactTracingUpdateItem {
    cloudTimestamp: number;
    tagTimestamp: number | null;
    tag1: number;
    tag2: number;
    beacon: number | null;
    distance: number | null;
    duration: number;
    start: number;
    stop: number;
    source: string;
    level: string;
}
export declare type RegisterRequest = {
    eventType: string;
    filter: MessageFilter;
    callback: (err: string | null, payload: object) => void;
    uuid: string | null;
};
export declare type SiteInformationResponse = {
    id: number;
    name: string;
    comment: string;
    country: string;
    city: string;
    postalCode: number;
    address: string;
    testEnd: Date | null;
    lat: number | null;
    lng: number | null;
    layoutVersions: DetailedSiteLayoutInformation[];
    neighbours: Dictionary<string>;
    layout: SiteLayout;
    tagGroups: TagGroup[];
};
export interface SiteLayoutInformation {
    majorId: number;
    majorNumber: number;
    minorId: number;
    minorNumber: number;
    comment: string;
}
export interface DetailedSiteLayoutInformation {
    start: Date | null;
    stop: Date | null;
}
export declare type SiteLayout = {
    floors: LayoutFloor[];
};
export interface BaseLayoutItem {
    id: number;
    permanentId: number;
    name: string;
    comment: string;
}
export interface LayoutFloor extends BaseLayoutItem {
    start: number | null;
    stop: number | null;
    layers: LayoutLayer[];
}
export interface LayoutLayer extends BaseLayoutItem {
    type: number;
    visible: boolean;
    opacity: number;
    overlapping: number;
    items: LayoutItem[];
}
export interface LayoutItem extends BaseLayoutItem {
    type: number;
    fileName: string;
    fileId: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    angle: number;
    radius: number;
    polygonPoints: PolygonPoint[];
    deviceId: number | null;
    tagStatus: number;
    z: number | null;
    isDeniedDirectionOnPlusSide: boolean;
    isSilentStrobe: boolean;
    isPosArea: boolean;
    mergeAlerts: number | null;
    movementNeeded: number | null;
    movementPeriod: number | null;
    isFittingRoomArea: boolean;
    generateSalesboostWithLocationingMode: boolean;
    buzzerOnSeconds: number;
    sleepLimit: number;
    tagCooldown: number | null;
    sniffOnly: boolean;
    quarantineRadius: number | null;
    isQuarantine: boolean;
    tagGroups: number[];
    guards: number[];
    isPlusDenied: boolean;
    suckTagInSeconds: number | null;
    nullIfRadiusExceeded: boolean;
    tagGroupsAsAnd: boolean;
    triggerRadiusInCount: number;
    triggerRadiusOutCount: number;
    denyBackupRequest: boolean;
    triggerInAmount: number | null;
    triggerInPeriod: number | null;
    triggerOutAmount: number | null;
    triggerOutPeriod: number | null;
    areaIds: number[];
    radiusSettingsForTagGroups: Dictionary<BeaconRadiusSettings>;
}
export declare type PolygonPoint = {
    x: number;
    y: number;
};
export declare type BeaconRadiusSettings = {
    radius: number | null;
    isQuarantine: boolean;
    nullIfRadiusExceeded: boolean;
    suckTagInSeconds: number | null;
    triggerRadiusInCount: number;
    triggerRadiusOutCount: number;
};
export declare type TagGroup = {
    GroupId: number;
    IdentifierId: number;
    IsWhiteList: boolean;
    Name: string;
    Color: number;
    Stop: number | null;
    Settings: TagGroupSettings;
};
export declare type TagGroupSettings = {
    P2PSettings: any;
    P2PMeasSamplingMillis: number | null;
};
export declare type P2PSettings = {
    ZoneConfigs: P2PZoneConfig[];
    SleepConfig: P2PSleepConfig;
    TxPowerConfig: P2PTxPowerConfig;
    ButtonConfigs: P2PButtonActionConfig[];
};
export declare type P2PZoneConfig = {
    Range: P2PRangeConfig;
    Buzzer: P2PBuzzerConfig;
    Delay: P2PDelayConfig;
};
export declare type P2PRangeConfig = {
    InvertRange: boolean;
    Range: number;
};
export declare type P2PBuzzerConfig = {
    BuzzerMode: number;
    BuzzerSound: number;
    LedBlinkMode: number;
    LedColor: number;
};
export declare type P2PDelayConfig = {
    AlertDelay: number;
    EventDelay: number;
};
export declare type P2PSleepConfig = {
    SleepDelay: number;
    NotMovingAlertTime: number;
};
export declare type P2PTxPowerConfig = {
    TxPower: number;
};
export declare type P2PButtonActionConfig = {
    ClickType: number;
    Action: number;
};
export declare type ServerMessageHandler = {
    callback: (payload: object) => void;
    uuid: string;
};
export {};
