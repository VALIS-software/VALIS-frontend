import EventCreator from './eventCreator.js';

const VIEW_EVENT_STATE_CHANGED = 'view_event_state_changed';
const VIEW_EVENT_CLICK = 'view_event_click';
const VIEW_EVENT_SELECTION = 'view_event_selection';
const VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS = 'EDIT_TRACK_VIEW';
const VIEW_EVENT_TRACK_ELEMENT_CLICKED = 'TRACK_ELEMENT_CLICKED';
const VIEW_EVENT_ADD_DATASET_BROWSER = 'ADD_DATASET_BROWSER';
const VIEW_EVENT_DATA_SET_SELECTED = 'DATA_SET_SELECTED';
const VIEW_EVENT_PUSH_VIEW = 'PUSH_VIEW';
const VIEW_EVENT_POP_VIEW = 'POP_VIEW';
const VIEW_EVENT_CLOSE_VIEW = 'CLOSE_VIEW';
const VIEW_EVENT_DISPLAY_ENTITY_DETAILS = 'DISPLAY_ENTITY_DETAILS';

export { VIEW_EVENT_STATE_CHANGED, VIEW_EVENT_CLICK, VIEW_EVENT_SELECTION, VIEW_EVENT_TRACK_ELEMENT_CLICKED, VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS, VIEW_EVENT_DATA_SET_SELECTED, VIEW_EVENT_PUSH_VIEW, VIEW_EVENT_POP_VIEW, VIEW_EVENT_CLOSE_VIEW, VIEW_EVENT_DISPLAY_ENTITY_DETAILS, };

class ViewModel extends EventCreator {

    constructor() {
        super();
    }

    init() {
        this.notifyViewStateChange(true);
    }

    notifyViewStateChange(saveHistory = false) {
        console.warn('@! refactor, notifyViewStateChange');

        const currentViewState = this.getViewState();
        const eventData = {
            currentViewState: currentViewState
        };

        this.notifyListeners(VIEW_EVENT_STATE_CHANGED, eventData);

        if (saveHistory) {
            const spanToSave = this.viewStateHistory.length + this.historyOffset + 1;
            this.historyOffset = -1;
            this.viewStateHistory = this.viewStateHistory.slice(0, spanToSave);
            this.viewStateHistory.push(currentViewState);
        }
    }

    loadViewHistory() {
        const idx = this.viewStateHistory.length + this.historyOffset;
        const state = this.viewStateHistory[idx];
        
        this.notifyViewStateChange();
    }

    pushView(title, info, elem) {
        this.notifyListeners(VIEW_EVENT_PUSH_VIEW, {
            title: title,
            info: info,
            view: elem
        });
    }

    popView() {
        this.notifyListeners(VIEW_EVENT_POP_VIEW);
    }

    closeView() {
        this.notifyListeners(VIEW_EVENT_CLOSE_VIEW);
    }

    editTrackViewSettings(viewGuid) {
        this.notifyListeners(VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS, viewGuid);
    }

    clickTrackElement(element) {
        this.notifyListeners(VIEW_EVENT_TRACK_ELEMENT_CLICKED, element);
    }

    dataSetSelected(trackType) {
        this.notifyListeners(VIEW_EVENT_DATA_SET_SELECTED, trackType);
    }

    displayEntityDetails(entity) {
        this.notifyListeners(VIEW_EVENT_DISPLAY_ENTITY_DETAILS, entity);
    }

    back() {
        console.warn('@! refactor, todo back');
        /*
        this.historyOffset = Math.max(
            -this.viewStateHistory.length,
            this.historyOffset - 1
        );
        this.loadViewHistory();
        */
    }

    forward() {
        console.warn('@! refactor, todo forward');
    }

    getViewState() {
        let x = null;
        let y = null;

        const viewState = {};

        return viewState;
    }

    /* @! refactor
    setViewRegion(startBasePair, basePairsPerPixel) {
        this.startBasePair = startBasePair;
        this.basePairsPerPixel = basePairsPerPixel;
        this.notifyViewStateChange();
    }
    */

    /* @! refactor
    setViewRegionUsingRange(startBasePair, endBasePair) {
        const basePairsPerPixel =
            (endBasePair - startBasePair) / this.windowSize[0];
        this.setViewRegion(startBasePair, basePairsPerPixel);
    }

    @! refactor
    centerOnBasePair(basePair) {
        this.startBasePair =
            basePair - this.basePairsPerPixel * this.windowSize[0] / 2.0;
        this.notifyViewStateChange();
    }

    @! refactor
    centerBasePairOnPixel(basePair, pixel) {
        this.startBasePair = basePair - pixel * this.basePairsPerPixel;
        this.notifyViewStateChange();
    }
    */

}

export default ViewModel;