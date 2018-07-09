import EventCreator from './eventCreator.js';

export enum ViewEvent {
    STATE_CHANGED,
    CLICK,
    SELECTION,
    EDIT_TRACK_VIEW_SETTINGS,
    TRACK_ELEMENT_CLICKED,
    ADD_DATASET_BROWSER,
    DATA_SET_SELECTED,
    PUSH_VIEW,
    POP_VIEW,
    CLOSE_VIEW,
    DISPLAY_ENTITY_DETAILS,
    DISPLAY_TRACK_RESULTS,
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
    }

    popView() {
        this.notifyListeners(ViewEvent.POP_VIEW);
    }

    closeView() {
        this.notifyListeners(ViewEvent.CLOSE_VIEW);
    }

    displayTrackSearchResults(viewGuid: string) {
        this.notifyListeners(ViewEvent.DISPLAY_TRACK_RESULTS, viewGuid);
    }

    clickTrackElement(element: any) {
        this.notifyListeners(ViewEvent.TRACK_ELEMENT_CLICKED, element);
    }

    dataSetSelected(trackType: any) {
        this.notifyListeners(ViewEvent.DATA_SET_SELECTED, trackType);
    }

    displayEntityDetails(entity: any) {
        this.notifyListeners(ViewEvent.DISPLAY_ENTITY_DETAILS, entity);
    }

}

export default ViewModel;