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
    z: number;
    uncertaintyDistance: number | null;
    floorId?: number;
};
export declare type LayoutUpdateItem = {
    minorId: number;
};
export declare type NodeDomainResponse = {
    domain: string;
};
interface Dictionary<T> extends Object {
    [key: number]: T;
}
export interface BeaconInitialStateResponse extends Dictionary<InitialBeaconState> {
}
export declare type InitialBeaconState = {
    online: boolean;
    charging: boolean | null;
    voltage: number | null;
};
export interface BeaconDiffResponse extends Dictionary<BeaconDiff> {
}
export declare type BeaconDiff = {
    online?: boolean | undefined;
    charging?: boolean | undefined;
    voltage?: number | undefined;
};
export declare type GetImageResponse = {
    name: string;
    contentType: string;
    data: string;
};
export declare type WorkflowResult = {
    ts: number;
    tags: number[];
    tagNames: string[];
    areaId: number | null;
    guid: string;
    steps: WorkflowStepResult[];
};
export declare type WorkflowStepResult = {
    id: number;
    name: string;
    ts: number;
    stopTs: number | null;
    ep: number | null;
    condition: number;
    area: number | null;
};
export declare type Workflow = {
    id: number;
    name: string;
    removed: boolean;
    flow: WorkflowData;
};
export declare type WorkflowData = {
    links: WorkflowLink[];
    steps: WorkflowStep[];
    tags: TagRestrictionForFlows;
    allowOverlapping: boolean;
    manuallyStartable: boolean;
    isMultiTag: boolean;
    disableAutoStepStart: boolean;
};
export declare type WorkflowLink = {
    from: number;
    to: number;
    fromConnector: string;
};
export declare type WorkflowStep = {
    id: number;
    left: number;
    top: number;
    name: string;
    type: number;
    step: WorkflowStepData | null;
    action: WorkflowStepAction | null;
};
export declare type WorkflowStepData = {
    delay: number | null;
    canMoveWithinDelay: boolean;
    timeout: number | null;
    writeToDb: boolean;
    previousAreaCondition: number;
    condition: number;
    areasForStep: number[] | null;
    tags: TagRestrictionForMultiTagStep | null;
    tagsForAllSteps: TagRestrictionForAllSteps | null;
    areas: AreaRestrictionForStep | null;
    tagProximity: TagProximityRestriction | null;
    tagMotion: TagMotionRestriction | null;
    externalTrigger: ExternalTrigger | null;
    uiButton: UiButtonStep | null;
    uiToggleButton: UiToggleButtonStep | null;
};
export declare type WorkflowStepAction = {
    type: number;
    tagsForAllActions: TagRestrictionForAllSteps;
    ledBuzzer: LedOrBuzzerAction | null;
    sms: SmsAction | null;
    customAlert: CustomAlertAction | null;
    renameTag: RenameTagAction | null;
    sleep: FlowSleepAction | null;
    clearGroup: ClearGroupAction | null;
    email: EmailAction | null;
    signalFlash: SignalFlashAction | null;
    startStep: StartStepAction | null;
    setTagGroup: SetTagGroupAction | null;
};
export declare type SetTagGroupAction = {
    groupId: number;
};
export declare type StartStepAction = {
    stepName: string;
};
export declare type SignalFlashAction = {
    deviceId: number;
    lightSeconds: number;
    soundSeconds: number;
};
export declare type EmailAction = {
    recipients: string;
    message: string;
    subject: string;
};
export declare type ClearGroupAction = {
    clearMain: boolean;
    clearSecondary: boolean;
};
export declare type FlowSleepAction = {
    seconds: number;
};
export declare type RenameTagAction = {
    name: string;
};
export declare type CustomAlertAction = {
    alertType: number;
    message: string;
};
export declare type SmsAction = {
    recipients: string;
    message: string;
};
export declare type LedOrBuzzerAction = {
    ledDuration: number | null;
    ledMode: number;
    blinkFrequency: number;
    buzzerDuration: number | null;
    buzzerMode: number;
    ledOff: boolean;
    buzzerOff: boolean;
};
export declare type UiToggleButtonStep = {
    buttonText0: string;
    buttonText1: string;
};
export declare type UiButtonStep = {
    buttonText: string;
};
export declare type ExternalTrigger = {
    identifier: string;
};
export declare type TagMotionRestriction = {
    movementNeeded: number;
    movementPeriod: number;
};
export declare type TagProximityRestriction = {
    distance: number | null;
    lowDistance: number | null;
    includeGroup: number | null;
    excludeGroup: number | null;
    batteryCondition: number | null;
    cooldown: number;
    bothTagsWithActionsAndResult: boolean;
    sameTagsAsPreviousStep: boolean;
};
export declare type AreaRestrictionForStep = {
    areaId: number;
    entrancePoints: number[] | null;
};
export declare type TagRestrictionForAllSteps = {
    allTags: boolean;
    tagGroups: number[] | null;
    inFlowCondition: number;
};
export declare type TagRestrictionForFlows = {
    allTags: boolean;
    tagGroups: number[] | null;
    deviceIds: number[] | null;
};
export declare type TagRestrictionForMultiTagStep = {
    groupId: number;
    amount: number;
    condition: number;
};
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
    timestamp: number;
    x: number;
    y: number;
    z: number;
    accelerometer: boolean;
    floorId: number;
    signalLost: boolean;
    powerSave: boolean;
    deviceModel: number;
    fwVersion: string;
    strokeCount: number;
    uncertaintyDistance: number | null;
    odometer: number;
    tripmeter: number;
    speed: number | null;
};
export interface AlertInitialStateResponse extends Dictionary<InitialAlertState> {
}
export interface InitialAlertState {
    alarmId: number;
    deviceId: number;
    alarmType: string;
    x: number;
    y: number;
    z: number;
    timestamp: string;
    reacted: string | null;
    floorId: number | null;
    areaNames: string[] | null;
    customTitle: string | null;
}
export interface AlertDiff extends InitialAlertState {
    areaIds: number[] | null;
}
interface AlertDiffAlerts extends Dictionary<AlertDiff> {
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
    z: number;
    floorId: number;
    signalLost: boolean;
    powerSave: boolean;
    fwVersion: string;
    timestamp: number;
    strokeCount: number;
    uncertaintyDistance: number | null;
    odometer: number;
    tripmeter: number;
    speed: number | null;
    twrTimestamp: number;
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
export interface AvailableBeaconsResponse extends Array<AvailableBeaconItem> {
}
export interface AvailableBeaconItem {
    deviceId: number;
    deviceModel: string;
    lastContact: number | null;
}
export declare type FillPolygonResponse = {
    slavePolygons: Polygon[];
};
export declare type FillPolygonRequest = {
    masterPolygon: Polygon;
    slavePolygons: Polygon[];
};
export declare type Polygon = {
    x: number;
    y: number;
    polygonPoints: PolygonPoint[];
};
export declare type CalibratePositionsResponse = {
    beaconPositions: CalibratedBeaconPosition[];
    tagPointPositions: TagPointPosition[];
    rectangleWidth: number | null;
    rectangleHeight: number | null;
    ignoredBeaconsFromCalibration: number[];
};
export declare type CalibratedBeaconPosition = {
    deviceId: number;
    x: number;
    y: number;
    z: number;
    floorId: number;
};
export declare type TagPointPosition = {
    id: number;
    x: number;
    y: number;
    z: number;
    floorId: number;
};
export declare type CalibratePositionsRequest = {
    positions: BeaconPosition[];
    tagPoints: number[];
    tagPointData: TagPointDataItem[] | null;
    maxDrift: number | null;
    shiftUp: boolean;
    amountOfBeaconsThatCanBeLeftOut: number;
};
export declare type BeaconPosition = {
    deviceId: number;
    x: number;
    y: number;
    z: number;
    positionStatus: number;
};
export declare type TagPointDataItem = {
    deviceId: number;
    id: number;
    x: number | null;
    y: number | null;
    z: number | null;
    distances: object;
};
export declare type RegisterRequest = {
    eventType: string;
    filter: MessageFilter;
    callback: (err: string | null, payload: object) => void;
    uuid: string | null;
};
export declare type TagBuzzerRequest = {
    devices: number[] | null;
    alertSound: boolean | null;
    buzzerSeconds: number | null;
    ledSeconds: number | null;
    buzzerOnInterval: number | null;
    buzzerOffInterval: number | null;
    ledColor: "green" | "red" | "yellow" | null;
    ledBlinkFrequency: 0 | 1 | 2 | 3 | null;
    playWithDelay: boolean | null;
};
export declare type SignalModuleRequest = {
    index: number;
    value: number;
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
export declare type GetLayoutRequest = {
    minorId: number | null;
};
export declare type GetLayoutResponse = {
    floors: LayoutFloor[];
    latitude: number | null;
    longitude: number | null;
    azimuthAngle: number | null;
};
export declare type SaveLayoutResponse = {
    layoutIds: SaveLayoutResponseItem[];
};
export declare type SaveLayoutResponseItem = {
    majorId: number;
    majorNumber: number;
    minorId: number;
    minorNumber: number;
};
export declare type SaveLayoutRequest = {
    guid: string;
    layout: SaveLayoutItem;
};
export declare type SaveLayoutItem = {
    account: number;
    site: number;
    layouts: LayoutsRequest;
    reloadSite: boolean;
};
export declare type LayoutsRequest = {
    remove: number[];
    update: object[];
    create: CreateLayoutRequest[];
};
export declare type CreateLayoutRequest = {
    comment: string;
    majorId: number | null;
    majorNumber: number | null;
    latitude: number | null;
    longitude: number | null;
    azimuthAngle: number | null;
    floors: LayoutFloor[];
};
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
