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
        
        const listeners = this.rawListeners(event);
        let handled = listeners.length > 0;
        
        for (const listener of listeners) {
            try {
                const res = Reflect.apply(listener, this, [payload, ...rest]);
                if (res instanceof Promise) {
                    res.catch(err => console.error(`[eventBus] async listener for "${event}" threw:`, err));
                }
            } catch (err) {
                console.error(`[eventBus] sync listener for "${event}" threw:`, err);
            }
        }
        
        return handled;
    }
}

module.exports = new eventBus();
