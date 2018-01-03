
import EventCreator from './eventCreator.js';
import Util from '../helpers/util.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

const _ = require('underscore');

const VIEW_EVENT_STATE_CHANGED = 'view_event_state_changed';
const VIEW_EVENT_CLICK = 'view_event_click';

export { 
  VIEW_EVENT_STATE_CHANGED,
  VIEW_EVENT_CLICK,
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
  }

  bindListeners(domElem) {
    domElem.addEventListener('keydown', this.handleKeydown);
    domElem.addEventListener('keyup', this.handleKeyup);
    domElem.addEventListener('wheel', this.handleMouse);
    domElem.addEventListener('mousemove', this.handleMouseMove);
    domElem.addEventListener('mousedown', this.handleMouseDown);
    domElem.addEventListener('mouseup', this.handleMouseUp);
    domElem.addEventListener('dblclick', this.handleDoubleClick);
  }

  removeListeners(domElem) {
    domElem.removeEventListener('keydown', this.handleKeydown);
    domElem.removeEventListener('keyup', this.handleKeyup);
    domElem.removeEventListener('wheel', this.handleMouse);
    domElem.removeEventListener('mousemove', this.handleMouseMove);
    domElem.removeEventListener('mousedown', this.handleMouseDown);
    domElem.removeEventListener('mouseup', this.handleMouseUp);
    domElem.removeEventListener('dblclick', this.handleDoubleClick);
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
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
  }

  centerOnBasePair(basePair) {
    this.startBasePair = basePair - this.basePairsPerPixel * this.windowSize[0] / 2.0;
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
  }

  centerBasePairOnPixel(basePair, pixel) {
    this.startBasePair = basePair - pixel * this.basePairsPerPixel;
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
  }

  handleMouseMove(e) {
    if (this.dragEnabled) {
      if (!this.selectEnabled) {
        const deltaX = e.offsetX - this.lastDragCoord[0];
        const deltaY = e.offsetY - this.lastDragCoord[1];
        if (Math.abs(deltaY) > 0) {
          const delta = Math.min(0.0, this.trackOffset + deltaY / this.windowSize[1]);
          this.trackOffset = delta;
        }

        if (Math.abs(deltaX) > 0) {
          const delta = -deltaX * this.basePairsPerPixel;
          this.startBasePair += delta;
        }
      }
    }
    this.lastDragCoord = [e.offsetX, e.offsetY];
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
  }

  handleMouse(e) {
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

          // compute the new startBasePair so that the cursor remains
          // centered on the same base pair after scaling:
          const rawPixelsAfter = lastBp / newBpPerPixel;
          this.startBasePair = (rawPixelsAfter - e.offsetX) * newBpPerPixel;
          this.basePairsPerPixel = newBpPerPixel;
        }
      }
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    }
  }

  handleMouseDown(evt) {
    this.dragEnabled = true;
    this.lastDragCoord = [evt.offsetX, evt.offsetY];
    this.startDragCoord = [evt.offsetX, evt.offsetY];
    // set focus on canvas:
    evt.currentTarget.setAttribute('tabindex', '0');
    evt.currentTarget.focus();
    // send the drag started event:
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
  }

  handleMouseUp(evt) {
    this.dragEnabled = false;
    this.lastDragCoord = null;
    this.startDragCoord = null;
    this.selectEnabled = false;
    this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    this.notifyListeners(VIEW_EVENT_CLICK, this.getViewState());
  }

  handleDoubleClick(evt) {
    const coord = [evt.offsetX, evt.offsetY];
    const windowSize = this.windowSize;
    const hoveredBasePair = Util.basePairForScreenX(coord[0], this.startBasePair, this.basePairsPerPixel, windowSize);
    const pixel = coord[0];
    Util.animate(this.basePairsPerPixel, this.basePairsPerPixel / 4.0, (alpha, start, end) => {
      this.basePairsPerPixel = alpha * start + (1.0 - alpha) * end;
      this.centerBasePairOnPixel(hoveredBasePair, pixel);
    }, 1.0);
  }

  handleKeydown(e) {
    if (e.key === 'Alt') {
      this.selectEnabled = true;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    } else if (e.key === 'Control') {
      this.zoomEnabled = true;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    } else if (e.key === 'a' || e.key === 'd') {
      const delta = ((e.key === 'a') ? 128 : -128) * this.basePairsPerPixel;
      this.startBasePair += delta;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    } else if (e.key === '=' || e.key === 'w') {
      const startCenter = this.startBasePair + this.basePairsPerPixel * this.windowSize[0] / 2.0;
      this.basePairsPerPixel /= 1.2;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    } else if (e.key === '-' || e.key === 's') {
      this.basePairsPerPixel *= 1.2;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    }
  }

  handleKeyup(e) {
    if (e.key === 'Alt') {
      this.selectEnabled = false;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    } else if (e.key === 'Control') {
      this.zoomEnabled = false;
      this.notifyListeners(VIEW_EVENT_STATE_CHANGED, this.getViewState());
    }
  }
}

export default ViewModel;
