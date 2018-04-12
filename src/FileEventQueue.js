const { display } = require('./lib/output');

const wrapHandler = finalHandler => events => finalHandler(events);

module.exports = class FileEventQueue {
  constructor({ context, handler, ticks = 300 }) {
    this._events = [];
    this._timeout = null;
    this._ticks = ticks;
    this._context = context;
    this._handler = wrapHandler(handler.bind(context));
  }

  _ensureNoPendingTimeout() {
    if (this._timeout) {
      clearTimeout(this._timeout);
      this._timeout = null;
    }
  }

  _scheduleHandlerCall() {
    this._timeout = setTimeout(() => {
      try {
        this._handler(this._events);
      } catch (err) {
        display(`FATAL: ${err.message}`);
      } finally {
        this._ensureNoPendingTimeout();
        this._events = [];
      }
    }, this._ticks);
  }

  add(event) {
   this._ensureNoPendingTimeout();
   this._events.push(event);
   this._scheduleHandlerCall();
  }
}
