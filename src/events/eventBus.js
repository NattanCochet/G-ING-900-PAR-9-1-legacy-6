const { EventEmitter } = require('events');

// A single process-wide bus: routes publish domain events, listeners subscribe independently.
class EventBus extends EventEmitter {
    // A misbehaving listener must never crash the request that triggered the event.
    emit(event, ...args) {
        try {
            return super.emit(event, ...args);
        } catch (err) {
            console.error(`[eventBus] listener for "${event}" threw:`, err);
            return false;
        }
    }
}

module.exports = new EventBus();
