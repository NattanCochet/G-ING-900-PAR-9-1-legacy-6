if (!process.env.SQLITE_DB_LOCATION) {
    process.env.SQLITE_DB_LOCATION = require('os').tmpdir() + '/todo.db';
}
const db = require('../../src/database/sqlite');
const fs = require('fs');
const location = db.location;

const ITEM = {
    id: '7aef3d7c-d301-4846-8358-2a91ec9d6be3',
    name: 'Test',
    completed: false,
};

const USER = {
    id: 'user-id-123',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed_password',
};

beforeEach(() => {
    if (fs.existsSync(location)) {
        fs.unlinkSync(location);
    }
});

test('it initializes correctly', async () => {
    await db.init();
});

test('it can store and retrieve items', async () => {
    await db.init();

    await db.storeItem(ITEM);

    const items = await db.getItems();
    expect(items.length).toBe(1);
    expect(items[0]).toEqual(ITEM);
});

test('it can update an existing item', async () => {
    await db.init();

    const initialItems = await db.getItems();
    expect(initialItems.length).toBe(0);

    await db.storeItem(ITEM);

    await db.updateItem(
        ITEM.id,
        Object.assign({}, ITEM, { completed: !ITEM.completed }),
    );

    const items = await db.getItems();
    expect(items.length).toBe(1);
    expect(items[0].completed).toBe(!ITEM.completed);
});

test('it can remove an existing item', async () => {
    await db.init();
    await db.storeItem(ITEM);

    await db.removeItem(ITEM.id);

    const items = await db.getItems();
    expect(items.length).toBe(0);
});

test('it can get a single item', async () => {
    await db.init();
    await db.storeItem(ITEM);

    const item = await db.getItem(ITEM.id);
    expect(item).toEqual(ITEM);
});

test('it returns undefined if item is not found', async () => {
    await db.init();
    const item = await db.getItem('non-existent-id');
    expect(item).toBeUndefined();
});

test('it can create and retrieve user by email', async () => {
    await db.init();

    await db.createUser(USER);

    const user = await db.getUserByEmail(USER.email);
    expect(user).toEqual(USER);
});

test('it can remove a user', async () => {
    await db.init();
    await db.createUser(USER);

    await db.deleteUser(USER.id);

    const user = await db.getUserByEmail(USER.email);
    expect(user).toBeUndefined();
});

test('it closes connection correctly on teardown', async () => {
    await db.init();
    await db.teardown();
});