const db = require('../database');

/**
 * @openapi
 * /columns:
 *   get:
 *     summary: Get all columns for a project (using query param)
 *     operationId: getColumnsQuery
 *     parameters:
 *       - name: project_id
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Internal server error
 * /projects/{projectId}/columns:
 *   get:
 *     summary: Get all columns for a project
 *     operationId: getColumns
 *     parameters:
 *       - name: projectId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Internal server error
 */
const getColumns = async (req, res) => {
    try {
        const projectId = req.params.projectId || req.query.project_id;
        if (!projectId) {
            return res.status(400).send({ error: 'project_id is required' });
        }
        const columns = await db.getColumns(projectId);
        res.send(columns);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /columns/{id}:
 *   get:
 *     summary: Get a column by ID
 *     operationId: getColumnById
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       404:
 *         description: Column not found
 *       500:
 *         description: Internal server error
 */
const getColumnById = async (req, res) => {
    try {
        const column = await db.getColumn(req.params.id);
        if (!column) {
            return res.status(404).send({ error: 'Column not found' });
        }
        res.send(column);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

module.exports = {
    getColumns,
    getColumnById,
};
