const db = require('../database');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     operationId: updateTask
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               column_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Task updated successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
module.exports = async (req, res) => {
    try {
        const existing = await db.getTask(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Task not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
            completed: req.body.completed !== undefined ? req.body.completed : existing.completed,
            column_id: req.body.column_id || existing.column_id,
        };

        await db.updateTask(req.params.id, updated);
        const result = await db.getTask(req.params.id);
        eventBus.emit(eventTypes.TASK_UPDATED, result);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
