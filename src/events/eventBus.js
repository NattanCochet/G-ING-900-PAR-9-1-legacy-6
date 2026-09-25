const { EventEmitter } = require('events');
const { validateEventPayload } = require('./contracts');

// A single process-wide bus: routes publish domain events, listeners subscribe independently.
class eventBus extends EventEmitter {
    // A misbehaving listener must never crash the request that triggered the event.
    emit(event, payload, ...rest) {
        const { valid, errors } = validateEventPayload(event, payload);
        if (!valid) {
            console.warn(`[eventBus] payload for "${event}" violates its contract (see src/events/contracts.js):`, errors);
        }
        try {
            return super.emit(event, payload, ...rest);
        } catch (err) {
            console.error(`[eventBus] listener for "${event}" threw:`, err);
            return false;
        }
    }
}

module.exports = new eventBus();
