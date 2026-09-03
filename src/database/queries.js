module.exports = {
    initTableSqlite: 'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
    initTableMysql: 'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
    getItems: 'SELECT * FROM todo_items',
    getItemById: 'SELECT * FROM todo_items WHERE id=?',
    insertItem: 'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
    updateItem: 'UPDATE todo_items SET name=?, completed=? WHERE id=?',
    deleteItem: 'DELETE FROM todo_items WHERE id=?'
};
