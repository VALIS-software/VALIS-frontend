
class EventCreator {
  constructor() {
    this.listeners = new Set();
  }

  addListener(listener, eventTypes=null) {
    this.listeners.add({
      callback: listener,
      eventTypes: new Set([].concat(eventTypes)),
    });
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners(eventType, data) {
    const evt = {
      sender: this,
      event: eventType,
      data: data,
    };
    this.listeners.forEach(target => {
      if (target.eventTypes === null || target.eventTypes.has(eventType)) {
        target.callback(evt);
      }
    });
  }
}

export default EventCreator;
