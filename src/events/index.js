const eventBus = require('./eventBus');
const eventTypes = require('./eventTypes');
const registerAuditLogger = require('./listeners/auditLogger');
const registerMailNotifier = require('./listeners/mailNotifier');

// Register every listener here; new consumers (websocket push, notifications, ...) plug in the same way.
if (process.env.NODE_ENV !== 'test') {
    registerAuditLogger();
    registerMailNotifier();
}

module.exports = { eventBus, eventTypes };
