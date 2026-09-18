const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /signup:
 *   post:
 *     summary: Register a new user
 *     operationId: signup
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Missing required fields
 *       409:
 *         description: Email already taken
 *       500:
 *         description: Internal server error
 */

module.exports = async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).send({ error: 'name, email and password are required' });
        }

        const existing = await db.getUserByEmail(email);
        if (existing) {
            return res.status(409).send({ error: 'email already taken' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { id: uuid(), name, email, password: hashedPassword };

        await db.createUser(user);
        eventBus.emit(eventTypes.USER_CREATED, { id: user.id, name: user.name, email: user.email });

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'changeme',
            { expiresIn: '24h' }
        );

        return res.status(201).send({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        if (typeof next === 'function') {
            next(err);
        } else {
            res.status(500).send({ error: 'internal server error' });
        }
    }
};