import { Strand } from 'valis';
import GenericIntervalTileStore from "./data-store/GenericIntervalTileStore";

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
    'variant': {
        query?: any
    },
    'interval': {
        query: any,
        tileStoreType: string,
        blendEnabled: boolean,
    },
}