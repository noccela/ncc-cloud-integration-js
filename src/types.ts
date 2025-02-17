export type AuthenticateResult = {
    tokenExpiration: number;
    tokenIssued: number;
  };

  export type TokenRefreshRequest = {
    authServerDomain: string,
    tokenExpiration: number,
    tokenIssued: number,
    getToken:(clientId: number, clientSecret: string, authOrigin: string) => Promise<AuthResult>
  };

  export type ConsoleLogger = {
    log: (msg:string) => void,
    warn: (msg:string) => void,
    error: (msg:string) => void,
    exception: (msg:string, e: string | null) => void,
    debug: (msg: string, b: any) => void,
  };

  export type UserOptions = {
    loggers: [ConsoleLogger],
    reopenBrokenConnection: boolean,
    retryIntervalMin: number,
    retryIntervalMax: number,
    retryIntervalIncrease: number,
    logRawMessages: boolean,
    onMessage: (() => void) | null,
    onClose: (() => void) | null,
    onError: (() => void) | null,
    onConnect: (() => void) | null,
    processMessages: true,
    requestTimeout: number,
    automaticTokenRenewal: boolean,
    tokenRefreshFailureRetryTimeout: number,
    registrationAttemptsUntilIgnored: number,
    waitForFailedReRegistration: number,
    getWsAddress: ((lbDomain: string, account: number, site: number, token: string) => Promise<string>) | null
  };

  export type Request = {
    uniqueId: string,
    action:string,
    payload: object
  };

  export type CloudResponse = {
    uniqueId: string,
    action: string | null,
    status: string,
    payload: any
  };

  export type AuthResponse = {
    expires_in: number,
		access_token: string,
	  error: string
  };

  export type AuthResult = {
    expiresIn: number,
		accessToken: string
  };

  export type AuthenticateResponse = {
    tokenExpiration: number,
		tokenIssued: number,
	  cloudVersion: string
  };
  export interface LocationUpdateResponse extends Dictionary<LocationUpdateItem> {};

  export type LocationUpdateItem = {
		timestamp: number,
    twrTimestamp?: number,
		x: number,
    y: number,
    z: number,
    uncertaintyDistance: number | null,
		floorId?: number
  };

  export declare type LayoutUpdateItem = {
    minorId: number
  };
  
  export type NodeDomainResponse = {
		domain: string
  };

  interface Dictionary<T> extends Object {
    [key: number]: T;
  }
  export interface BeaconInitialStateResponse extends Dictionary<InitialBeaconState> {};

  export type InitialBeaconState = {
    online: boolean,
    charging: boolean | null,
    voltage: number | null
  };
  export interface BeaconDiffResponse extends Dictionary<BeaconDiff> {};
  export type BeaconDiff = {
    online?: boolean | undefined,
    charging?: boolean | undefined,
    voltage?: number | undefined
  };

export type GetImageResponse = {
  name: string,
  contentType: string,
  data: string
};

export type WorkflowResult = {
  ts: number,
  tags: number[],
  tagNames: string[],
  areaId: number | null,
  guid: string
  steps: WorkflowStepResult[]
};
export type WorkflowStepResult = {
  id: number,
  name:string,
  ts: number,
  stopTs: number | null,
  ep: number | null,
  condition: number,
  area: number | null
 
};

export type Workflow = {
  id: number,
  name: string,
  removed: boolean,
  flow: WorkflowData
};

export type WorkflowData = {
    links: WorkflowLink[],
    steps: WorkflowStep[],
    tags: TagRestrictionForFlows,
    allowOverlapping: boolean,
    manuallyStartable: boolean,
    isMultiTag: boolean,
    disableAutoStepStart: boolean,
   
};

export type WorkflowLink = {
    from: number,
    to: number,
    fromConnector: string
};

export type WorkflowStep = {
  id: number,
  left: number,
  top: number,
  name: string,
  type: number,
  step: WorkflowStepData | null,
  action: WorkflowStepAction | null
};
export type WorkflowStepData = {
  delay: number | null,
  canMoveWithinDelay: boolean,
  timeout: number | null,
  writeToDb: boolean,
  previousAreaCondition: number,
  condition: number,
  areasForStep: number[] | null,
  tags: TagRestrictionForMultiTagStep | null,
  tagsForAllSteps : TagRestrictionForAllSteps | null,
  areas : AreaRestrictionForStep | null,
  tagProximity: TagProximityRestriction | null,
  tagMotion: TagMotionRestriction | null,
  externalTrigger: ExternalTrigger | null,
  uiButton: UiButtonStep | null,
  uiToggleButton: UiToggleButtonStep | null
};
export type WorkflowStepAction = {
  type: number,
  tagsForAllActions: TagRestrictionForAllSteps,
  ledBuzzer: LedOrBuzzerAction | null,
  sms: SmsAction | null,
  customAlert: CustomAlertAction | null,
  renameTag: RenameTagAction | null,
  sleep: FlowSleepAction | null,
  clearGroup: ClearGroupAction | null,
  email : EmailAction | null,
  signalFlash : SignalFlashAction | null,
  startStep: StartStepAction | null,
  setTagGroup: SetTagGroupAction | null,
};
export type SetTagGroupAction = {
  groupId: number,

};
export type StartStepAction = {
  stepName: string,

};
export type SignalFlashAction = {
  deviceId: number,
  lightSeconds: number,
  soundSeconds: number
};
export type EmailAction = {
  recipients: string,
  message: string,
  subject: string
};
export type ClearGroupAction = {
  clearMain: boolean,
  clearSecondary: boolean
};
export type FlowSleepAction = {
  seconds: number,

};
export type RenameTagAction = {
  name: string,

};
export type CustomAlertAction = {
  alertType: number,
  message: string,

};
export type SmsAction = {
  recipients: string,
  message: string,

};
export type LedOrBuzzerAction = {
    ledDuration: number | null,
    ledMode: number,
    blinkFrequency: number,
    buzzerDuration: number | null,
    buzzerMode: number,
    ledOff: boolean,
    buzzerOff: boolean
};
export type UiToggleButtonStep = {
  buttonText0: string,
  buttonText1: string
};
export type UiButtonStep = {
  buttonText: string
};
export type ExternalTrigger = {
    identifier: string
};
export type TagMotionRestriction = {
  movementNeeded: number,
  movementPeriod: number,
 
};
export type TagProximityRestriction = {
    distance: number | null,
    lowDistance: number | null,
    includeGroup: number | null,
    excludeGroup: number | null,
    batteryCondition: number | null,
    cooldown: number,
    bothTagsWithActionsAndResult: boolean,
    sameTagsAsPreviousStep: boolean
};
export type AreaRestrictionForStep = {
  areaId: number,
  entrancePoints: number[] | null,
};
export type TagRestrictionForAllSteps = {
  allTags: boolean,
  tagGroups: number[] | null,
  inFlowCondition: number
};
export type TagRestrictionForFlows = {
  allTags: boolean,
  tagGroups: number[] | null,
  deviceIds: number[] | null
};
export type TagRestrictionForMultiTagStep = {
    groupId: number,
    amount: number,
    condition: number
};


  export interface TagInitialStateResponse extends Dictionary<InitialTagState> {};

  export type InitialTagState = {
    name: string,
    batteryVoltage: number,
    batteryStatus: number,
    status: number,
    areas: number[],
    wire: boolean,
    reed: boolean,
    isOnline: boolean
    timestamp: number,
    x: number,
    y: number,
    z: number,
    accelerometer: boolean,
    floorId: number,
    signalLost: boolean,
    powerSave: boolean,
    deviceModel: number,
    fwVersion: string,
    strokeCount: number,
    uncertaintyDistance: number | null,
    odometer: number,
    tripmeter: number,
    speed: number | null
  };

  export interface AlertInitialStateResponse extends Dictionary<InitialAlertState> {};

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
  };

  export interface AlertDiff extends InitialAlertState {
    areaIds: number[] | null
  }

  interface AlertDiffAlerts extends Dictionary<AlertDiff> {};

  export type AlertDiffResponse = {
    alerts: AlertDiffAlerts | null,
    removedAlerts: number[] | null
  };

  interface TagDiffTags extends Dictionary<TagDiffItem> {};

  export type TagDiffItem = {
    name: string,
    batteryStatus: number,
    status: number,
    areas: number[],
    isOnline: boolean
    x: number,
    y: number,
    z: number,
    floorId: number,
    signalLost: boolean,
    powerSave: boolean,
    fwVersion: string,
    timestamp: number,
    strokeCount: number,
    uncertaintyDistance: number | null,
    odometer: number,
    tripmeter: number,
    speed: number | null,
    twrTimestamp: number
  };

  export type TagDiffResponse = {
    tags: TagDiffTags | null
    removedTags: string[] | null
  };

  export type TwrDataResponse = {
    tId: number,
    bId: number,
    t: number,
    d: number 
  };

  export interface MessageFilter {
    deviceIds: number[] | null
  };

  export interface TwrDataFilter extends MessageFilter {
    tagDeviceIds: number[] | null,
    beaconDeviceIds: number[] | null
  };

  export interface P2PDistanceUpdateResponse extends Array<P2PDistanceUpdateItem> {}

  export interface P2PDistanceUpdateItem {
		tag1: number,
    tag2: number,
    beacon: number,
    distance: number,
    timestamp: number
  };

  export interface ContactTracingUpdateResponse extends Array<ContactTracingUpdateItem> {}

  export interface ContactTracingUpdateItem {
		cloudTimestamp: number,
    tagTimestamp: number | null,
    tag1: number,
    tag2: number,
    beacon: number | null,
    distance: number | null,
    duration: number,
    start: number,
    stop: number,
    source: string,
    level: string
  };
  export interface AvailableBeaconsResponse extends Array<AvailableBeaconItem> {}
  export interface AvailableBeaconItem {
    deviceId: number,
    deviceModel: string,
    lastContact: number | null
  };
  export type FillPolygonResponse = {
    slavePolygons: Polygon[]
  };
  export type FillPolygonRequest = {
    masterPolygon: Polygon,
    slavePolygons: Polygon[]
  };
  export type Polygon = {
    x: number,
    y: number,
    polygonPoints: PolygonPoint[]
  };
  export type CalibratePositionsResponse = {
    beaconPositions: CalibratedBeaconPosition[],
    tagPointPositions: TagPointPosition[],
    rectangleWidth: number | null,
    rectangleHeight: number | null,
    ignoredBeaconsFromCalibration: number[]
  };
  export type CalibratedBeaconPosition = {
    deviceId: number,
    x: number,
    y: number,
    z: number,
    floorId: number
  };
  export type TagPointPosition = {
    id: number,
    x: number,
    y: number,
    z: number,
    floorId: number
  };
  export type CalibratePositionsRequest = {
    positions: BeaconPosition[],
    tagPoints: number[],
    tagPointData: TagPointDataItem[] | null,
    maxDrift: number | null,
    shiftUp: boolean,
    amountOfBeaconsThatCanBeLeftOut: number
  };
  export type BeaconPosition = {
    deviceId: number,
    x: number,
    y: number,
    z: number,
    positionStatus: number
  };
  export type TagPointDataItem = {
    deviceId: number,
    id: number,
    x: number | null,
    y: number | null,
    z: number | null,
    distances : object
  };
  export type RegisterRequest = {
    eventType: string,
    filter: MessageFilter,
    callback: (err: string | null, payload: object) => void,
    uuid: string | null
  };
  export type TagBuzzerRequest = {
    devices: number[] | null, // If null all tags will be played
    alertSound: boolean | null, // if null then false
    buzzerSeconds: number | null, // if null then 15
    ledSeconds: number | null, // if null then 15
    buzzerOnInterval: number | null, // if null then 5
    buzzerOffInterval: number | null, // if null then 5
    ledColor: "green" | "red" | "yellow" | null, // if null then green
    //0 => no blink
    // 1 => 4Hz
    // 2 => 2Hz
    // 3 => 1Hz
    ledBlinkFrequency: 0 | 1 | 2 | 3 | null, // if null then 2
    playWithDelay: boolean | null // if null then false
  };
  export type SignalModuleRequest = {
    index: number,
    value: number
  };
  export type SiteInformationResponse = {
    id: number,
    name: string,
    comment: string,
    country: string,
    city: string,
    postalCode: number,
    address: string,
    testEnd: Date | null,
    lat: number | null,
    lng: number | null,
    layoutVersions: DetailedSiteLayoutInformation[],
    neighbours: Dictionary<string>,
    layout: SiteLayout,
    tagGroups: TagGroup[]
  };

  export interface SiteLayoutInformation {
    majorId: number,
    majorNumber: number,
    minorId: number,
    minorNumber: number,
    comment: string
  };

  export interface DetailedSiteLayoutInformation {
    start: Date | null,
    stop: Date | null,
  };
  export type GetLayoutRequest = {
    minorId: number | null
  };
  export type GetLayoutResponse = {
    floors: LayoutFloor[],
    latitude: number | null,
    longitude: number | null,
    azimuthAngle: number | null
  };
  export type SaveLayoutResponse = {
    layoutIds: SaveLayoutResponseItem[]
  };
  export type SaveLayoutResponseItem = {
    majorId: number,
    majorNumber: number,
    minorId: number,
    minorNumber: number
  };
  export type SaveLayoutRequest = {
    guid: string,
    layout: SaveLayoutItem
  };

  export type SaveLayoutItem = {
    account: number,
    site: number,
    layouts: LayoutsRequest,
    reloadSite: boolean
  };
  export type LayoutsRequest = {
    remove: number[],
    update: object[],
    create: CreateLayoutRequest[]
  };
  export type CreateLayoutRequest = {
    comment: string,
    majorId: number | null,
    majorNumber: number | null,
    latitude: number | null,
    longitude: number | null,
    azimuthAngle: number | null,
    floors: LayoutFloor[]
  };
  export type SiteLayout = {
    floors: LayoutFloor[]
  };

  export interface BaseLayoutItem {
    id: number,
    permanentId: number,
    name: string,
    comment: string
  };

  export interface LayoutFloor extends BaseLayoutItem {
    start: number | null,
    stop: number | null,
    layers: LayoutLayer[]
  };

  export interface LayoutLayer extends BaseLayoutItem {
    type: number,
    visible: boolean,
    opacity: number,
    overlapping: number,
    items: LayoutItem[]
  };

  export interface LayoutItem extends BaseLayoutItem {
    type: number,
    fileName: string,
    fileId: number,
    minX: number,
    minY: number,
    maxX: number,
		maxY: number,
    angle: number,
    radius: number,
    polygonPoints: PolygonPoint[],
    deviceId: number | null,
    tagStatus: number,
    z: number | null,
		isDeniedDirectionOnPlusSide: boolean,
    isSilentStrobe: boolean,
    isPosArea: boolean,
		mergeAlerts: number | null,
    movementNeeded: number | null,
    movementPeriod: number | null,
    isFittingRoomArea: boolean,
    generateSalesboostWithLocationingMode: boolean,
    buzzerOnSeconds: number,
    sleepLimit: number,
    tagCooldown: number | null,
    sniffOnly: boolean,
    quarantineRadius: number | null,
    isQuarantine: boolean,
    tagGroups: number[],
    guards: number[]
    isPlusDenied: boolean,
    suckTagInSeconds: number | null,
    nullIfRadiusExceeded: boolean,
    tagGroupsAsAnd: boolean,
    triggerRadiusInCount: number,
    triggerRadiusOutCount: number,
    denyBackupRequest: boolean,
    triggerInAmount: number | null,
    triggerInPeriod: number | null,
    triggerOutAmount: number | null,
    triggerOutPeriod: number | null,
    areaIds: number[],
    radiusSettingsForTagGroups: Dictionary<BeaconRadiusSettings>
  };

  export type PolygonPoint = {
    x: number,
    y: number
  };

  export type BeaconRadiusSettings = {
    radius: number | null,
    isQuarantine: boolean
    nullIfRadiusExceeded: boolean,
    suckTagInSeconds: number | null,
    triggerRadiusInCount: number,
    triggerRadiusOutCount: number
  };

  export type TagGroup = {
    GroupId: number,
		IdentifierId: number,
    IsWhiteList: boolean
    Name: string,
		Color: number,
    Stop: number | null,
    Settings: TagGroupSettings
  };

  export type TagGroupSettings = {
    P2PSettings: any,
		P2PMeasSamplingMillis: number | null
  }

  export type P2PSettings = {
    ZoneConfigs: P2PZoneConfig[],
    SleepConfig: P2PSleepConfig,
    TxPowerConfig: P2PTxPowerConfig,
    ButtonConfigs: P2PButtonActionConfig[]
  };

  export type P2PZoneConfig = {
    Range: P2PRangeConfig,
    Buzzer: P2PBuzzerConfig,
    Delay: P2PDelayConfig
  };

  export type P2PRangeConfig = {
    InvertRange: boolean,
    Range: number
  };

  export type P2PBuzzerConfig = {
    BuzzerMode: number,
    BuzzerSound: number,
    LedBlinkMode: number,
    LedColor: number
  };

  export type P2PDelayConfig = {
    AlertDelay: number,
    EventDelay: number
  };

  export type P2PSleepConfig = {
    SleepDelay: number,
    NotMovingAlertTime: number
  };

  export type P2PTxPowerConfig = {
    TxPower: number
  };

  export type P2PButtonActionConfig = {
    ClickType: number,
    Action: number
  };

  export type ServerMessageHandler = {
    callback: (payload: object) => void,
    uuid: string
  };
