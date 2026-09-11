const db = require('../database');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     operationId: deleteTask
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       500:
 *         description: Internal server error
 */
module.exports = async (req, res) => {
    try {
        await db.deleteTask(req.params.id);
        eventBus.emit(eventTypes.TASK_DELETED, { id: req.params.id });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
