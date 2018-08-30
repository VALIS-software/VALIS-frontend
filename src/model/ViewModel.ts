import EventCreator from './eventCreator.js';

export enum ViewEvent {
    STATE_CHANGED,
    CLICK,
    SELECTION,
    EDIT_TRACK_VIEW_SETTINGS,
    ADD_DATASET_BROWSER,
    DATA_SET_SELECTED,
    PUSH_VIEW,
    POP_VIEW,
    CLOSE_VIEW,
    SHOW_VIEW,
}

export class ViewModel extends EventCreator {

    constructor() {
        super();
    }

    pushView(title: string, info: any, elem: React.ReactNode) {
        this.notifyListeners(ViewEvent.PUSH_VIEW, {
            title: title,
            info: info,
            view: elem
        });
        this.notifyListeners(ViewEvent.SHOW_VIEW);
    }

    popView() {
        this.notifyListeners(ViewEvent.POP_VIEW);
    }

    closeNavigationView() {
        this.notifyListeners(ViewEvent.CLOSE_VIEW);
    }

    showNavigationView() {
        this.notifyListeners(ViewEvent.SHOW_VIEW);
    }

    dataSetSelected(trackType: any) {
        this.notifyListeners(ViewEvent.DATA_SET_SELECTED, trackType);
    }

}

export default ViewModel;