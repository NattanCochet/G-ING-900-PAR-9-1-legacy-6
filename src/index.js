require('dotenv').config();
const express = require('express');
const app = express();
const db = require('./database');
const auth = require('./middleware/auth');
require('./events'); // registers domain-event listeners (audit log, ...)
const { apiReference } = require('@scalar/express-api-reference');
const swaggerJsdoc = require('swagger-jsdoc');

const openapiSpec = swaggerJsdoc({
    definition: {
        openapi: '3.1.0',
        info: { title: 'Legacy Project API', version: '0.1' },
    },
    apis: [__dirname + '/routes/*.js'],
});
const signup = require('./routes/signup');
const login = require('./routes/login');
const deleteUser = require('./routes/deleteUser');

const addProject = require('./routes/addProject');
const { getProjects, getProjectById } = require('./routes/getProjects');
const updateProject = require('./routes/updateProject');
const deleteProject = require('./routes/deleteProject');

const addColumn = require('./routes/addColumn');
const { getColumns, getColumnById } = require('./routes/getColumns');
const updateColumn = require('./routes/updateColumn');
const deleteColumn = require('./routes/deleteColumn');

const addTask = require('./routes/addTask');
const { getTasks, getTaskById } = require('./routes/getTasks');
const updateTask = require('./routes/updateTask');
const deleteTask = require('./routes/deleteTask');

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/front/views');
app.use(express.static(__dirname + '/front/static'));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login'));
app.get('/home', (req, res) => res.render('index'));
app.get('/register', (req, res) => res.render('register'));

app.post('/register', signup);
app.post('/signup', signup);
app.post('/login', login);
app.delete('/users/:id', auth, deleteUser);


app.get('/projects', auth, getProjects);
app.post('/projects', auth, addProject);
app.get('/projects/:id', auth, getProjectById);
app.put('/projects/:id', auth, updateProject);
app.delete('/projects/:id', auth, deleteProject);

app.get('/projects/:projectId/columns', auth, getColumns);
app.post('/projects/:projectId/columns', auth, addColumn);
app.get('/columns', auth, getColumns);
app.post('/columns', auth, addColumn);
app.get('/columns/:id', auth, getColumnById);
app.put('/columns/:id', auth, updateColumn);
app.delete('/columns/:id', auth, deleteColumn);

app.get('/projects/:projectId/tasks', auth, getTasks);
app.post('/projects/:projectId/tasks', auth, addTask);
app.get('/tasks', auth, getTasks);
app.post('/tasks', auth, addTask);
app.get('/tasks/:id', auth, getTaskById);
app.put('/tasks/:id', auth, updateTask);
app.delete('/tasks/:id', auth, deleteTask);

app.get('/openapi.json', (req, res) => res.send(openapiSpec));
app.use('/reference', apiReference({ url: '/openapi.json' }));

db.init().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => { })
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown);
