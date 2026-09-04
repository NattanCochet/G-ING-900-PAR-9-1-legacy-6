const db = require('../database');

/**
 * @openapi
 * /items/{id}:
 *   delete:
 *     summary: Remove an item
 *     operationId: deleteItem
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed
 */

module.exports = async (req, res) => {
    await db.removeItem(req.params.id);
    res.sendStatus(200);
};
