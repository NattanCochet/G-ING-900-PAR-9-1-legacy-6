const eventBus = require('./eventBus');
const eventTypes = require('./eventTypes');
const registerAuditLogger = require('./listeners/auditLogger');

// Register every listener here; new consumers (websocket push, notifications, ...) plug in the same way.
registerAuditLogger();

module.exports = { eventBus, eventTypes };
