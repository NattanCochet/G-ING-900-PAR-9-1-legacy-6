const db = require('../database');

/**
 * @openapi
 * /items:
 *   get:
 *     summary: List all items
 *     operationId: getItems
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 */

module.exports = async (req, res) => {
    const items = await db.getItems();
    res.send(items);
};
