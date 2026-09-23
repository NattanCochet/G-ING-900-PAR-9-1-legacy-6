const db = require('../../src/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { login } = require('../../src/routes/auth');

jest.mock('../../src/database', () => ({
    getUserByEmail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
    sign: jest.fn(),
}));

const STORED_USER = {
    id: 'user-id-123',
    name: 'Alice',
    email: 'alice@example.com',
    password: 'hashed_secret',
};

beforeEach(() => {
    jest.clearAllMocks();
});

test('it logs in a user correctly', async () => {
    const req = { body: { email: 'alice@example.com', password: 'secret' } };
    const res = { send: jest.fn(), status: jest.fn().mockReturnThis() };

    db.getUserByEmail.mockReturnValue(Promise.resolve(STORED_USER));
    bcrypt.compare.mockReturnValue(Promise.resolve(true));
    jwt.sign.mockReturnValue('fake.jwt.token');

    await login(req, res);

    expect(db.getUserByEmail.mock.calls.length).toBe(1);
    expect(db.getUserByEmail.mock.calls[0][0]).toBe('alice@example.com');

    expect(bcrypt.compare.mock.calls.length).toBe(1);
    expect(bcrypt.compare.mock.calls[0][0]).toBe('secret');
    expect(bcrypt.compare.mock.calls[0][1]).toBe('hashed_secret');

    expect(res.send.mock.calls[0][0]).toEqual({
        token: 'fake.jwt.token',
        user: { id: 'user-id-123', name: 'Alice', email: 'alice@example.com' },
    });
});

test('it returns 400 if email is missing', async () => {
    const req = { body: { password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await login(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(db.getUserByEmail.mock.calls.length).toBe(0);
});

test('it returns 400 if password is missing', async () => {
    const req = { body: { email: 'alice@example.com' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    await login(req, res);

    expect(res.status.mock.calls[0][0]).toBe(400);
    expect(db.getUserByEmail.mock.calls.length).toBe(0);
});

test('it returns 401 if user does not exist', async () => {
    const req = { body: { email: 'unknown@example.com', password: 'secret' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    db.getUserByEmail.mockReturnValue(Promise.resolve(undefined));

    await login(req, res);

    expect(res.status.mock.calls[0][0]).toBe(401);
    expect(bcrypt.compare.mock.calls.length).toBe(0);
});

test('it returns 401 if password is wrong', async () => {
    const req = { body: { email: 'alice@example.com', password: 'wrong' } };
    const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

    db.getUserByEmail.mockReturnValue(Promise.resolve(STORED_USER));
    bcrypt.compare.mockReturnValue(Promise.resolve(false));

    await login(req, res);

    expect(res.status.mock.calls[0][0]).toBe(401);
    expect(jwt.sign.mock.calls.length).toBe(0);
});