/**
 * @! temporary design
 */
import { TrackTypeMap } from "../TrackTypeMap";
import { TileStore } from "./TileStore";

type StringMap<T> = { [id: string]: T };

export const SharedTileStore: {
    [K in keyof TrackTypeMap]: StringMap<TileStore<any, any>>
} = {
    ['empty']: {},
    ['sequence']: {},
    ['annotation']: {},
}

export default SharedTileStore;