const db = require('../../src/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { signup } = require('../../src/routes/auth');

jest.mock('../../src/database', () => ({
    getUserByEmail: jest.fn(),
    createUser: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn() }));

beforeEach(() => {
    jest.clearAllMocks();
});

test('it signs up a new user correctly', async () => {
    const req = { body: { name: 'Alice', email: 'alice@example.com', password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    db.getUserByEmail.mockReturnValue(Promise.resolve(undefined));
    bcrypt.hash.mockReturnValue(Promise.resolve('hashed_secret'));
    uuid.mockReturnValue('user-id-123');
    jwt.sign.mockReturnValue('fake.jwt.token');

    await signup(req, res);

    expect(db.getUserByEmail.mock.calls.length).toBe(1);
    expect(db.getUserByEmail.mock.calls[0][0]).toBe('alice@example.com');

    expect(bcrypt.hash.mock.calls.length).toBe(1);
    expect(bcrypt.hash.mock.calls[0][0]).toBe('secret');
    expect(bcrypt.hash.mock.calls[0][1]).toBe(10);

    expect(db.createUser.mock.calls.length).toBe(1);
    expect(db.createUser.mock.calls[0][0]).toEqual({
        id: 'user-id-123',
        name: 'Alice',
        email: 'alice@example.com',
        password: 'hashed_secret',
    });

    expect(res.status.mock.calls[0][0]).toBe(201);
    expect(res.send.mock.calls[0][0]).toEqual({
        token: 'fake.jwt.token',
        user: { id: 'user-id-123', name: 'Alice', email: 'alice@example.com' },
    });
});

test('it returns 400 if name is missing', async () => {
    const req = { body: { email: 'alice@example.com', password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await signup(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(db.createUser.mock.calls.length).toBe(0);
});

test('it returns 400 if email is missing', async () => {
    const req = { body: { name: 'Alice', password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await signup(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(db.createUser.mock.calls.length).toBe(0);
});

test('it returns 400 if password is missing', async () => {
    const req = { body: { name: 'Alice', email: 'alice@example.com' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await signup(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(db.createUser.mock.calls.length).toBe(0);
});

test('it returns 409 if email is already taken', async () => {
    const req = { body: { name: 'Alice', email: 'alice@example.com', password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    db.getUserByEmail.mockReturnValue(Promise.resolve({ id: 'existing', email: 'alice@example.com' }));

    await signup(req, res);

    expect(res.status.mock.calls[0][0]).toBe(409);
    expect(db.createUser.mock.calls.length).toBe(0);
});