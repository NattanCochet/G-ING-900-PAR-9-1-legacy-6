const db = require('../database');

/**
 * @openapi
 * /columns/{id}:
 *   delete:
 *     summary: Delete a column
 *     operationId: deleteColumn
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Column deleted successfully
 *       500:
 *         description: Internal server error
 */
module.exports = async (req, res) => {
    try {
        await db.deleteColumn(req.params.id);
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};
