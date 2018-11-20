import { IntervalTrack, BlendMode, Tile, IntervalInstance, IntervalInstances, IntervalTilePayload, Rect, UsageCache, Object2D, Text, OpenSansRegular, Renderable, Animator } from "genome-visualizer";
import { IntervalTrackModelOverride } from "./IntervalTrackModelOverride";

type ColorPalette = {
    r: Array<number>,
    g: Array<number>,
    b: Array<number>,
};

// thanks to ShaderToy user 'blackjero' for his qunitic regression of popular scientific color palettes
// https://www.shadertoy.com/view/XtGGzG
const plasmaPalette: ColorPalette = {
    r: [+0.063861086, +1.992659096, -1.023901152, -0.490832805, +1.308442123, -0.914547012],
    g: [+0.049718590, -0.791144343, +2.892305078, +0.811726816, -4.686502417, +2.717794514],
    b: [+0.513275779, +1.580255060, -5.164414457, +4.559573646, -1.916810682, +0.570638854],
};

const magmaPalette: ColorPalette = {
    r: [-0.023226960, +1.087154378, -0.109964741, +6.333665763, -11.640596589, +5.337625354],
    g: [+0.010680993, +0.176613780, +1.638227448, -6.743522237, +11.426396979, -5.523236379],
    b: [-0.008260782, +2.244286052, +3.005587601, -24.279769818, +32.484310068, -12.688259703],
}

const viridis = {
    r: [+0.280268003, -0.143510503, +2.225793877, -14.815088879, +25.212752309, -11.772589584],
    g: [-0.002117546, +1.617109353, -1.909305070, +2.701152864, -1.685288385, +0.178738871],
    b: [+0.300805501, +2.614650302, -12.019139090, +28.933559110, -33.491294770, +13.762053843],
}

function quintic(constants: Array<number>, x: number) {
    let x2 = x * x, x3 = x2 * x, x4 = x3 * x, x5 = x4 * x;
    return constants[0]
        + constants[1] * x
        + constants[2] * x2
        + constants[3] * x3
        + constants[4] * x4
        + constants[5] * x5;
}

/**
 * Override interval track to add a 'blendEnabled' flag
 */
export class IntervalTrackOverride extends IntervalTrack<IntervalTrackModelOverride> {

    constructor(model: IntervalTrackModelOverride) {
        super(model);
        // enable interactive interval labels
        this.intervalLabels = true;
    }

    protected displayTileNode(tile: Tile<IntervalTilePayload>, z: number, continuousLodLevel: number) {
        const span = this.x1 - this.x0;
        let node = super.displayTileNode(tile, z, continuousLodLevel);
        node.borderStrength = 0.1;

        if (this.model.blendEnabled === false) {
            node.opacity = 1;
            node.blendMode = BlendMode.NONE;
        }

        return node;
    }

    protected intervalLabelKey(tile: Tile<IntervalTilePayload>, index: number, startIndex: number, endIndex: number) {
        let hasCount = this.model.displayCount && tile.payload.userdata.hasCounts;
        let superKey = super.intervalLabelKey(tile, index, startIndex, endIndex);
        return hasCount ? (superKey + '/' + tile.payload.userdata.counts[index]) : superKey;
    }

    protected createLabel(tile: Tile<IntervalTilePayload>, index: number) {
        let label = super.createLabel(tile, index);

        // set the label text to the interval count if it exists
        if (this.model.displayCount && tile.payload.userdata.hasCounts) {
            label.string = tile.payload.userdata.counts[index];
        }

        // add click interaction
        label.cursorStyle = 'pointer';

        label.addInteractionListener('click', (e) => {
            const intervalId = tile.payload.userdata.ids[index];
            console.log('click', intervalId); // need to do something here...
        });

        // change opacity on pointer hover to hint clickablity
        label.addInteractionListener('pointerenter', (e) => {
            Animator.springTo(label, { 'opacity': 0.1 }, 600);
        });

        label.addInteractionListener('pointerleave', (e) => {
            Animator.springTo(label, { 'opacity': 0.0 }, 600);
        });

        return label;
    }

    protected createInstance(tilePayload: IntervalTilePayload, intervalIndex: number, relativeX: number, relativeW: number): IntervalInstance {
        let instance = super.createInstance(tilePayload, intervalIndex, relativeX, relativeW);

        if (this.model.displayCount && tilePayload.userdata && tilePayload.userdata.hasCounts) {
            let count = tilePayload.userdata.counts[intervalIndex];

            let x = count / this.model.maxCount;

            x = Math.min(Math.max(x, 0), 1);

            // @! hack to make the data appear less exponential for aesthetics
            x = Math.pow(x, 0.75);

            instance.color = [
                quintic(magmaPalette.r, x),
                quintic(magmaPalette.g, x),
                quintic(magmaPalette.b, x),
                0.66,
            ];
        }

        return instance;
    }

}