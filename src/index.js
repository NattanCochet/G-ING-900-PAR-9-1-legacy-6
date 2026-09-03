const express = require('express');
const app = express();
const db = require('./database');
const getItems = require('./routes/getItems');
const addItem = require('./routes/addItem');
const updateItem = require('./routes/updateItem');
const deleteItem = require('./routes/deleteItem');
const { apiReference } = require('@scalar/express-api-reference');

app.use(express.json());
app.use(express.static(__dirname + '/front/static'));

app.get('/items', getItems);
app.post('/items', addItem);
app.put('/items/:id', updateItem);
app.delete('/items/:id', deleteItem);

app.get('/openapi.json', (req, res) => res.sendFile(__dirname + '/openapi.json'));
app.use('/reference', apiReference({ url: '/openapi.json' }));

db.init().then(() => {
    app.listen(process.env.PORT || 3000, () => console.log(`Listening on port ${process.env.PORT || 3000}`));
}).catch((err) => {
    console.error(err);
    process.exit(1);
});

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
