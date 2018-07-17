import { TileStore } from "./TileStore";

export class SharedTileStore {

    private static tileStores: {
        [type: string]: {
            [sequenceId: string]: TileStore<any, any>
        }
    } = {};

    static getTileStore<T extends TileStore<any, any>>(type: string, sequenceId: string, constructor: () => T): T {
        let typeTileStores = this.tileStores[type] = this.tileStores[type] || {};
        let tileStore: T = typeTileStores[sequenceId] = (typeTileStores[sequenceId] as T) || constructor();
        return tileStore;
    }

    static clear(type: string) {
        let typeTileStores = this.tileStores[type];
        if (typeTileStores === undefined) return;

        for (let sequenceId in typeTileStores) {
            let tileStore = typeTileStores[sequenceId];
            tileStore.clear();
        }

        delete this.tileStores[type];
    }

    static clearAll() {
        for (let type in this.tileStores) {
            this.clear(type);
        }
    }

}

export default SharedTileStore;