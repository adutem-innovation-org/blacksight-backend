import EventEmitter2 from "eventemitter2";

export const eventEmitter = new EventEmitter2({
  wildcard: true,
  maxListeners: 20,
});
