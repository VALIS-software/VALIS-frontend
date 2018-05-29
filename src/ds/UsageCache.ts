export class UsageCache<T> {

    protected cache: {
        [key: string]: {
            value: T,
            used: boolean,
        }
    } = {};

    constructor() {}

    get(key: string, onCacheMiss: (key: string) => T) {
        let entry = this.cache[key];

        if (entry === undefined) {
            let value = onCacheMiss(key);

            entry = this.cache[key] = {
                value: value,
                used: true,
            }
        }

        entry.used = true;

        return entry.value;
    }

    markAllUnused() {
        // reset 'used' flag in cache
        for (let key in this.cache) {
            this.cache[key].used = false;
        }
    }

    removeUnused(onRemove: (value: T) => void) {
        for (let key in this.cache) {
            let entry = this.cache[key];
            if (!entry.used) {
                onRemove(entry.value);
                delete this.cache[key];
            }
        }
    }

    removeAll(onRemove: (value: T) => void) {
        this.markAllUnused();
        this.removeUnused(onRemove);
    }

}

export default UsageCache;