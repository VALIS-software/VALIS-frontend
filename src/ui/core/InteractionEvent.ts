import Object2D from "./Object2D";

export interface InteractionEventMap {
    'pointermove': InteractionEvent;
    'pointerdown': InteractionEvent;
    'pointerup': InteractionEvent;
    'click': InteractionEvent;
    'dblclick': InteractionEvent;
    'wheel': WheelInteractionEvent;
}

export type InteractionEventInternal = {
    defaultPrevented: boolean;
    propagationStopped: boolean;
}

export interface InteractionEventInit {
    target: Object2D;

    canvasX: number;
    canvasY: number;
    localX: number;
    localY: number;
    fractionX: number;
    fractionY: number;

    button: number;
    buttons: number;
    altKey: boolean;
    ctrlKey: boolean;
    shiftKey: boolean;
    metaKey: boolean;

    pointerId: number;
    isPrimary: boolean;
    pointerType: 'mouse' | 'pen' | 'touch';

    pressure: number;
    width: number;
    height: number;
    tiltX: number;
    tiltY: number;
}

export class InteractionEvent {

    protected defaultPrevented = false;
    protected propagationStopped = false;
    
    readonly target: Object2D;

    readonly canvasX: number;
    readonly canvasY: number;
    readonly localX: number;
    readonly localY: number;
    readonly fractionX: number;
    readonly fractionY: number;

    readonly button: number;
    readonly buttons: number;
    readonly altKey: boolean;
    readonly ctrlKey: boolean;
    readonly shiftKey: boolean;
    readonly metaKey: boolean;

    // advanced data from PointerEvents API
    // https://www.w3.org/TR/pointerevents/
    readonly pointerId: number;
    readonly isPrimary: boolean;
    readonly pointerType: 'mouse' | 'pen' | 'touch';

    readonly pressure: number;
    readonly width: number;
    readonly height: number;
    readonly tiltX: number;
    readonly tiltY: number;

    constructor(init: InteractionEventInit) {
        this.target = init.target;
        this.canvasX = init.canvasX;
        this.canvasY = init.canvasY;
        this.localX = init.localX;
        this.localY = init.localY;
        this.fractionX = init.fractionX;
        this.fractionY = init.fractionY;
        this.button = init.button;
        this.buttons = init.buttons;
        this.altKey = init.altKey;
        this.ctrlKey = init.ctrlKey;
        this.shiftKey = init.shiftKey;
        this.metaKey = init.metaKey;

        this.pointerId = init.pointerId;
        this.isPrimary = init.isPrimary;
        this.pointerType = init.pointerType;
        this.pressure = init.pressure;
        this.width = init.width;
        this.height = init.height;
        this.tiltX = init.tiltX;
        this.tiltY = init.tiltY;
    }

    preventDefault() {
        this.defaultPrevented = true;
    }

    stopPropagation() {
        this.propagationStopped = true;
    }

}

export interface WheelInteractionEventInit extends InteractionEventInit {
    wheelDeltaX: number;
    wheelDeltaY: number;
    wheelDeltaZ: number;
}

export class WheelInteractionEvent extends InteractionEvent {
    readonly wheelDeltaX: number;
    readonly wheelDeltaY: number;
    readonly wheelDeltaZ: number;

    constructor(init: WheelInteractionEventInit) {
        super(init);
        this.wheelDeltaX = init.wheelDeltaX;
        this.wheelDeltaY = init.wheelDeltaY;
        this.wheelDeltaZ = init.wheelDeltaZ;
    }

}

export default InteractionEvent;