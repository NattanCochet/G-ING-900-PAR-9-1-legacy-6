const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const { eventBus, eventTypes } = require('../events');

/**
 * @openapi
 * /signup:
 *   post:
 *     summary: Register a new user
 *     operationId: signup
 *     tags: [Auth]
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
const signup = async (req, res, next) => {
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
        const uuid = require('uuid').v4;
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

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Login a user
 *     operationId: login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful login
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
 *         description: Missing credentials
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).send({ error: 'email and password are required' });
        }

        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(401).send({ error: 'invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(401).send({ error: 'invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'changeme',
            { expiresIn: '24h' }
        );

        return res.send({ token, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        if (typeof next === 'function') {
            next(err);
        } else {
            res.status(500).send({ error: 'internal server error' });
        }
    }
};

/**
 * @openapi
 * /users/{id}:
 *   delete:
 *     summary: Delete a user
 *     operationId: deleteUser
 *     tags: [Auth]
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
const deleteUser = async (req, res) => {
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

router.post('/register', signup);
router.post('/signup', signup);
router.post('/login', login);
router.delete('/users/:id', auth, deleteUser);

module.exports = router;
module.exports.signup = signup;
module.exports.login = login;
module.exports.deleteUser = deleteUser;
