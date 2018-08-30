export default interface Persistable<T> {
    getPersistentState(): T;
    setPersistentState(state: T): void;
}