const express = require('express');
const router = express.Router();
const db = require('../database');
const { v4: uuid } = require('uuid');
const { eventBus, eventTypes } = require('../events');
const columnRouter = require('./columns');
const taskRouter = require('./tasks');

/**
 * @openapi
 * /projects:
 *   post:
 *     summary: Create a new project
 *     operationId: addProject
 *     tags: [Projects]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Project created
 */
const addProject = async (req, res) => {
    try {
        const { name, description = null } = req.body;
        const creator_id = req.user ? req.user.id : req.body.creator_id;

        if (!name) {
            return res.status(400).send({ error: 'name is required' });
        }
        if (!creator_id) {
            return res.status(400).send({ error: 'creator_id is required' });
        }

        const project = {
            id: uuid(),
            creator_id,
            name,
            description,
        };

        await db.createProject(project);
        eventBus.emit(eventTypes.PROJECT_CREATED, project);
        res.status(201).send(project);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects:
 *   get:
 *     summary: Get all projects (or current user projects)
 *     operationId: getProjects
 *     tags: [Projects]
 */
const getProjects = async (req, res) => {
    try {
        const creator_id = req.user ? req.user.id : req.query.creator_id;
        const projects = await db.getProjects(creator_id);
        res.send(projects);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}:
 *   get:
 *     summary: Get a project by ID
 *     operationId: getProjectById
 *     tags: [Projects]
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
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
const getProjectById = async (req, res) => {
    try {
        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }
        res.send(project);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}:
 *   put:
 *     summary: Update a project
 *     operationId: updateProject
 *     tags: [Projects]
 */
const updateProject = async (req, res) => {
    try {
        const existing = await db.getProject(req.params.id);
        if (!existing) {
            return res.status(404).send({ error: 'Project not found' });
        }

        const updated = {
            name: req.body.name || existing.name,
            description: req.body.description !== undefined ? req.body.description : existing.description,
        };

        await db.updateProject(req.params.id, updated);
        const result = await db.getProject(req.params.id);
        eventBus.emit(eventTypes.PROJECT_UPDATED, result);
        res.send(result);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}:
 *   delete:
 *     summary: Delete a project
 *     operationId: deleteProject
 *     tags: [Projects]
 */
const deleteProject = async (req, res) => {
    try {
        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }
        if (req.user && project.creator_id !== req.user.id) {
            return res.status(403).send({ error: 'Forbidden: only the owner can delete the project' });
        }
        await db.deleteProject(req.params.id);
        eventBus.emit(eventTypes.PROJECT_DELETED, { id: req.params.id });
        res.sendStatus(200);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}/leave:
 *   post:
 *     summary: Leave a project
 *     operationId: leaveProject
 *     tags: [Projects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left or deleted the project
 *       403:
 *         description: Forbidden (not a member)
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
const leaveProject = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        if (!userId) return res.status(401).send({ error: 'Unauthorized' });

        const projectId = req.params.id;
        const project = await db.getProject(projectId);
        
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }

        if (project.creator_id === userId) {
            await db.deleteProject(projectId);
            eventBus.emit(eventTypes.PROJECT_DELETED, { id: projectId });
            return res.status(200).send({ message: 'Project deleted' });
        }

        const users = await db.getProjectUsers(projectId);
        const isMember = users.some(u => u.id === userId);
        
        if (!isMember) {
            return res.status(403).send({ error: 'Forbidden' });
        }

        await db.removeUserFromProject(projectId, userId);
        res.status(200).send({ message: 'Left project' });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}/invite:
 *   post:
 *     summary: Invite a user to a project by email
 *     operationId: inviteUserToProject
 *     tags: [Projects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User invited successfully
 *       404:
 *         description: Project or User not found
 *       500:
 *         description: Internal server error
 */
const inviteUser = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ error: 'email is required' });
        }

        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }

        const user = await db.getUserByEmail(email);
        if (!user) {
            return res.status(404).send({ error: 'User not found' });
        }

        await db.assignUserToProject(project.id, user.id);
        res.status(200).send({ message: 'User invited successfully', user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}/users:
 *   get:
 *     summary: Get users assigned to a project
 *     operationId: getProjectUsers
 *     tags: [Projects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful response
 *       500:
 *         description: Internal server error
 */
const getProjectUsers = async (req, res) => {
    try {
        const users = await db.getProjectUsers(req.params.id);
        res.send(users);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

/**
 * @openapi
 * /projects/{id}/users/{userId}:
 *   delete:
 *     summary: Remove a user from a project
 *     operationId: removeUserFromProject
 *     tags: [Projects]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User removed successfully
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
const removeUser = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const project = await db.getProject(id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }

        await db.removeUserFromProject(id, userId);
        res.status(200).send({ message: 'User removed successfully' });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

const getProjectOwner = async (req, res) => {
    try {
        const project = await db.getProject(req.params.id);
        if (!project) {
            return res.status(404).send({ error: 'Project not found' });
        }
        const user = await db.getUserById(project.creator_id);
        if (!user) {
            return res.status(404).send({ error: 'Owner not found' });
        }
        res.send({ id: user.id, name: user.name, email: user.email });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
};

router.use('/:projectId/columns', columnRouter);
router.use('/:projectId/tasks', taskRouter);

router.get('/', getProjects);
router.get('/:id/owner', getProjectOwner);
router.post('/', addProject);
router.get('/:id', getProjectById);
router.put('/:id', updateProject);
router.delete('/:id', deleteProject);

router.post('/:id/leave', leaveProject);
router.post('/:id/invite', inviteUser);
router.get('/:id/users', getProjectUsers);
router.delete('/:id/users/:userId', removeUser);

module.exports = router;
module.exports.addProject = addProject;
module.exports.getProjects = getProjects;
module.exports.getProjectById = getProjectById;
module.exports.updateProject = updateProject;
module.exports.deleteProject = deleteProject;
module.exports.leaveProject = leaveProject;
module.exports.inviteUser = inviteUser;
module.exports.getProjectUsers = getProjectUsers;
module.exports.removeUser = removeUser;
module.exports.getProjectOwner = getProjectOwner;
