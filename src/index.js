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

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const columnRoutes = require('./routes/columns');
const taskRoutes = require('./routes/tasks');

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', __dirname + '/front/views');
app.use(express.static(__dirname + '/front/static'));

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => res.render('login'));
app.get('/home', (req, res) => res.render('home'));
app.get('/register', (req, res) => res.render('register'));

app.use('/', authRoutes);
app.use('/projects', auth, projectRoutes);
app.use('/columns', auth, columnRoutes);
app.use('/tasks', auth, taskRoutes);

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
