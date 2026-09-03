const jwt = require('jsonwebtoken');
const auth = require('../../src/middleware/auth');

jest.mock('jsonwebtoken', () => ({
    verify: jest.fn(),
}));

test('it calls next() with a valid token', () => {
    const req = { headers: { authorization: 'Bearer valid.token.here' } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    jwt.verify.mockReturnValue({ id: 'user-id-123', username: 'alice' });

    auth(req, res, next);

    expect(jwt.verify.mock.calls.length).toBe(1);
    expect(jwt.verify.mock.calls[0][0]).toBe('valid.token.here');
    expect(req.user).toEqual({ id: 'user-id-123', username: 'alice' });
    expect(next.mock.calls.length).toBe(1);
    expect(res.sendStatus.mock.calls.length).toBe(0);
});

test('it returns 401 if no authorization header', () => {
    const req = { headers: {} };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    auth(req, res, next);

    expect(res.sendStatus.mock.calls.length).toBe(1);
    expect(res.sendStatus.mock.calls[0][0]).toBe(401);
    expect(next.mock.calls.length).toBe(0);
});

test('it returns 401 if authorization header does not start with Bearer', () => {
    const req = { headers: { authorization: 'Basic sometoken' } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    auth(req, res, next);

    expect(res.sendStatus.mock.calls.length).toBe(1);
    expect(res.sendStatus.mock.calls[0][0]).toBe(401);
    expect(next.mock.calls.length).toBe(0);
});

test('it returns 401 if token is invalid', () => {
    const req = { headers: { authorization: 'Bearer bad.token' } };
    const res = { sendStatus: jest.fn() };
    const next = jest.fn();

    jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

    auth(req, res, next);

    expect(res.sendStatus.mock.calls.length).toBe(1);
    expect(res.sendStatus.mock.calls[0][0]).toBe(401);
    expect(next.mock.calls.length).toBe(0);
});