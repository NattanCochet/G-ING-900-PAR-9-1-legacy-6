const db = require('../database');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     operationId: deleteUser
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
module.exports = async (req, res) => {
    try {
        if (req.user && req.user.id !== req.params.id) {
            return res.sendStatus(403);
        }

        await db.deleteUser(req.params.id);
        eventBus.emit(eventTypes.USER_DELETED, { id: req.params.id });
        res.sendStatus(200);
    } catch {
        res.sendStatus(500);
    }
};