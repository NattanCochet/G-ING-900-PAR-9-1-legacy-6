const db = require('../database');

/**
 * @openapi
 * /columns/{id}:
 *   put:
 *     summary: Update a column
 *     operationId: updateColumn
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
 *     responses:
 *       200:
 *         description: Column updated successfully
 *       404:
 *         description: Column not found
 *       500:
 *         description: Internal server error
 */
module.exports = async (req, res) => {
    try {
        const existing = await db.getColumn(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Column not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
        };

        await db.updateColumn(req.params.id, updated);
        const result = await db.getColumn(req.params.id);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
