require('dotenv').config();
const express = require('express');
const app = express();
const db = require('./database');
const auth = require('./middleware/auth');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');
const signup = require('./routes/signup');
const login = require('./routes/login');
const deleteUser = require('./routes/deleteUser');

app.use(express.json());
app.use(express.static(__dirname + '/front/static'));

app.post('/register', signup);
app.post('/signup', signup);
app.post('/login', login);
app.delete('/users/:id', auth, deleteUser);

app.get('/items', auth, getItems);
app.post('/items', auth, addItem);
app.put('/items/:id', auth, updateItem);
app.delete('/items/:id', auth, deleteItem);

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
