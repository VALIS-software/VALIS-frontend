
import EventCreator from './eventCreator.js';
import Util from '../helpers/util.js';
import { GENOME_LENGTH, MAX_BASE_PAIR_WIDTH } from '../helpers/constants.js';

const _ = require('underscore');

const VIEW_EVENT_STATE_CHANGED = 'view_event_state_changed';
const VIEW_EVENT_CLICK = 'view_event_click';
const VIEW_EVENT_SELECTION = 'view_event_selection';

export { 
  VIEW_EVENT_STATE_CHANGED,
  VIEW_EVENT_CLICK,
  VIEW_EVENT_SELECTION,
};

class ViewModel extends EventCreator {
  constructor() {
    super();
    this.basePairsPerPixel = 1;
    this.windowSize = [0, 0]; 
    this.startBasePair = 0;
    this.trackOffset = 0.0;
    this.lastDragCoord = null;
    this.startDragCoord = null;
    this.panning = false;
    this.zoomEnabled = false;
    this.selectEnabled = false;
    this.viewStateHistory = [];
    this.historyOffset = 0;
    this.domElem = null;
    
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleKeyup = this.handleKeyup.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouse = this.handleMouse.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleDoubleClick = this.handleDoubleClick.bind(this);
  }

  init(basePairsPerPixel, windowSize) {
    this.basePairsPerPixel = basePairsPerPixel;
    this.windowSize = windowSize;
    this.notifyViewStateChange(true);
  }

  bindListeners(domElem) {
    this.domElem = domElem;
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('keyup', this.handleKeyup);
    domElem.addEventListener('wheel', this.handleMouse);
    // continue to capture mouse movement when the mouse leaves the browser window
    window.addEventListener('mousemove', this.handleMouseMove);
    domElem.addEventListener('mousedown', this.handleMouseDown);
    // capture mouse-up events on the window so that drag operations are ended no matter where the mouse is at the time (even outside the window)
    window.addEventListener('mouseup', this.handleMouseUp);
    domElem.addEventListener('dblclick', this.handleDoubleClick);
  }

  removeListeners(domElem) {
    this.domElem = null;
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('keyup', this.handleKeyup);
    domElem.removeEventListener('wheel', this.handleMouse);
    window.removeEventListener('mousemove', this.handleMouseMove);
    domElem.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    domElem.removeEventListener('dblclick', this.handleDoubleClick);
  }

  notifyViewStateChange(saveHistory=false) {
    const currentViewState = this.getViewState();
    const eventData = {
      currentViewState: currentViewState,
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
    this.windowSize = state.windowSize;
    this.basePairsPerPixel = state.basePairsPerPixel;
    this.trackOffset = state.trackOffset;
    this.startBasePair = state.startBasePair;
    this.panning = false;
    this.dragEnabled = false;
    this.selectEnabled = false;
    this.zoomEnabled = false;
    this.lastDragCoord = null;
    this.startDragCoord = null;
    this.notifyViewStateChange();
  }

  back() {
    this.historyOffset = Math.max(-this.viewStateHistory.length, this.historyOffset - 1);
    this.loadViewHistory();
  }

  forward() {
    this.historyOffset = Math.min(-1, this.historyOffset + 1);
    this.loadViewHistory();
  }

  getViewState() {
    if (!this.windowSize) return {};

    let x = null;
    let y = null;
    const windowHeight = this.windowSize[1];
    if (this.lastDragCoord) {
      x = Util.basePairForScreenX(this.lastDragCoord[0], this.startBasePair, this.basePairsPerPixel, this.windowSize);  
      y = this.lastDragCoord[1] / windowHeight;
    }
    
    const viewState = {
      windowSize: this.windowSize,
      basePairsPerPixel: this.basePairsPerPixel,
      trackOffset: this.trackOffset,
      trackBasePairOffset: 0,
      startBasePair: this.startBasePair,
      selectedBasePair: x,
      selectedTrackOffset: y,
      panning: this.panning,
      dragEnabled: this.dragEnabled,
      selectEnabled: this.selectEnabled,
      zoomEnabled: this.zoomEnabled,
      lastDragCoord: this.lastDragCoord,
      startDragCoord: this.startDragCoord,
    };

    if (this.selectEnabled) {
      if (this.startDragCoord && this.lastDragCoord) {
        viewState.selection = {
          min: this.startDragCoord,
          max: this.lastDragCoord,
        };
      }
    }
    return viewState;
  }

  setViewRegion(startBasePair, basePairsPerPixel) {
    this.startBasePair = startBasePair;
    this.basePairsPerPixel = basePairsPerPixel;
    this.notifyViewStateChange();
  }

  setViewRegionUsingRange(startBasePair, endBasePair) {
    const basePairsPerPixel = (endBasePair - startBasePair) / this.windowSize[0];
    this.setViewRegion(startBasePair, basePairsPerPixel);
  }

  centerOnBasePair(basePair) {
    this.startBasePair = basePair - this.basePairsPerPixel * this.windowSize[0] / 2.0;
    this.notifyViewStateChange();
  }

  centerBasePairOnPixel(basePair, pixel) {
    this.startBasePair = basePair - pixel * this.basePairsPerPixel;
    this.notifyViewStateChange();
  }

  handleMouseMove(e) {
    if (e.target === this.domElem || this.dragEnabled) {
      e.preventDefault();
      if (this.dragEnabled) {
        if (Math.abs(e.movementY) > 0 && !this.selectEnabled) {
          const delta = Math.min(0.0, this.trackOffset + e.movementY / this.windowSize[1]);
          this.trackOffset = delta;
        }

        if (Math.abs(e.movementX) > 0 && !this.selectEnabled) {
          const delta = -e.movementX * this.basePairsPerPixel;
          this.startBasePair += delta;
        }
      }

      // calculate position relative to domElem
      const domRect = this.domElem.getBoundingClientRect();
      const domX = window.scrollX + domRect.left;
      const domY = window.scrollY + domRect.top;
      this.lastDragCoord = [e.pageX - domX, e.pageY - domY];
    } else {
      this.lastDragCoord = null;
    }
    this.notifyViewStateChange();
  }

  handleMouse(e) {
    e.preventDefault();
    if (this.dragEnabled) {
      return;
    } else if (this.basePairsPerPixel <= GENOME_LENGTH / (this.windowSize[0])) {
      // x pan sets the base pair!
      if (Math.abs(e.deltaX) > 0) {
        const delta = (e.deltaX * this.basePairsPerPixel);
        this.startBasePair += delta;
        this.panning = true;
      } else {
        this.panning = false;
        if (Math.abs(e.deltaY) > 0) {
          const lastBp = Util.basePairForScreenX(e.offsetX, 
                                                  this.startBasePair, 
                                                  this.basePairsPerPixel, 
                                                  this.windowSize);
          
          let newBpPerPixel = this.basePairsPerPixel / (1.0 - (e.deltaY / 1000.0));  
          newBpPerPixel = Math.min(GENOME_LENGTH / (this.windowSize[0]), newBpPerPixel);
          newBpPerPixel = Math.max(1.0 / MAX_BASE_PAIR_WIDTH, newBpPerPixel);
          // compute the new startBasePair so that the cursor remains
          // centered on the same base pair after scaling:
          const rawPixelsAfter = lastBp / newBpPerPixel;
          this.startBasePair = (rawPixelsAfter - e.offsetX) * newBpPerPixel;
          this.basePairsPerPixel = newBpPerPixel;
        }
      }
      this.notifyViewStateChange();
    }
  }

  handleMouseDown(evt) {
    // only begin drag when the primary button is used
    if (evt.button === 0) {
      this.dragEnabled = true;
      this.lastDragCoord = [evt.offsetX, evt.offsetY];
      this.startDragCoord = [evt.offsetX, evt.offsetY];
      // set focus on canvas:
      // evt.currentTarget.setAttribute('tabindex', '1');
      // evt.currentTarget.focus();
      // send the drag started event:
      this.notifyViewStateChange();
    }
  }

  handleMouseUp(evt) {
    if (evt.target === this.domElem || this.dragEnabled) {
      evt.preventDefault();

      if (this.selectEnabled) {
        const windowSize = this.windowSize;
        const start = Math.min(this.startDragCoord[0], this.lastDragCoord[0]);
        const end = Math.max(this.startDragCoord[0], this.lastDragCoord[0]);
        const startBp = Util.basePairForScreenX(start, this.startBasePair, this.basePairsPerPixel, windowSize);
        const endBp = Util.basePairForScreenX(end, this.startBasePair, this.basePairsPerPixel, windowSize);
        if (startBp !== endBp) this.notifyListeners(VIEW_EVENT_SELECTION, { startBp, endBp });
      } else {
        this.notifyListeners(VIEW_EVENT_CLICK, this.lastDragCoord);
      }
      this.dragEnabled = false;
      this.lastDragCoord = null;
      this.startDragCoord = null;
      this.notifyViewStateChange(true);
    }
  }

  handleDoubleClick(evt) {
    const coord = [evt.offsetX, evt.offsetY];
    const windowSize = this.windowSize;
    const hoveredBasePair = Util.basePairForScreenX(coord[0], this.startBasePair, this.basePairsPerPixel, windowSize);
    const pixel = coord[0];
    Util.animate(this.basePairsPerPixel, this.basePairsPerPixel/4.0, (alpha, start, end) => {
      this.basePairsPerPixel = alpha * start + (1.0 - alpha) * end;
      this.centerBasePairOnPixel(hoveredBasePair, pixel);
    }, 1.0);
  }

  handleKeydown(e) {
    if (e.key === 'Shift') {
      this.selectEnabled = true;
      this.notifyViewStateChange(true);
    } else if (e.key === 'Control') {
      this.zoomEnabled = true;
      this.notifyViewStateChange(true);
    } else if (e.key === 'a' || e.key === 'd') {
      const delta = ((e.key === 'a') ? 128 : -128) * this.basePairsPerPixel;
      this.startBasePair += delta;
      this.notifyViewStateChange(true);
    } else if (e.key === '=' || e.key === 'w') {
      const startCenter = this.startBasePair + this.basePairsPerPixel * this.windowSize[0] / 2.0;
      this.basePairsPerPixel /= 1.2;
      this.notifyViewStateChange(true);
    } else if (e.key === '-' || e.key === 's') {
      this.basePairsPerPixel *= 1.2;
      this.notifyViewStateChange(true);
    }
  }

  handleKeyup(e) {
    if (e.key === 'Shift') {
      this.selectEnabled = false;
      this.notifyViewStateChange();
    } else if (e.key === 'Control') {
      this.zoomEnabled = false;
      this.notifyViewStateChange();
    }
  }
}

export default ViewModel;
