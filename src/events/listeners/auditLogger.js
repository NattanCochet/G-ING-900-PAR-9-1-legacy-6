const eventBus = require('../eventBus');
const eventTypes = require('../eventTypes');

/**
 * First example consumer: writes every domain event to the console as an audit trail.
 * Proves listeners can be added/removed without touching route handlers.
 */
module.exports = function registerAuditLogger() {
    Object.values(eventTypes).forEach((event) => {
        eventBus.on(event, (payload) => {
            console.log(`[audit] ${new Date().toISOString()} ${event}`, payload);
        });
    });
};
