const nodemailer = require('nodemailer');
const eventBus = require('../../src/events/eventBus');
const eventTypes = require('../../src/events/eventTypes');
const registerMailNotifier = require('../../src/events/listeners/mailNotifier');

// Mock nodemailer to prevent sending real emails during tests
jest.mock('nodemailer');

describe('Mail Notifier Listener', () => {
    let mockSendMail;
    
    beforeEach(() => {
        // Clean mocks before each test
        jest.clearAllMocks();
        
        // Prepare a fake sendMail function that returns a resolved promise
        mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-message-id' });
        
        nodemailer.createTransport.mockReturnValue({
            sendMail: mockSendMail
        });
        
        nodemailer.createTestAccount.mockResolvedValue({
            user: 'test-user',
            pass: 'test-pass'
        });
        
        // Remove previous listeners to isolate each test
        eventBus.removeAllListeners();
    });

    it('should configure the Ethereal transporter if no SMTP variable is defined', async () => {
        delete process.env.SMTP_HOST;
        
        await registerMailNotifier();

        expect(nodemailer.createTestAccount).toHaveBeenCalled();
        expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({
            host: 'smtp.ethereal.email'
        }));
    });

    it('should send a welcome email when USER_CREATED is emitted', async () => {
        await registerMailNotifier();

        // Simulate user creation
        const payload = { id: 42, name: 'John Doe', email: 'john@example.com' };
        eventBus.emit(eventTypes.USER_CREATED, payload);

        // Allow time for the event loop to process the async callback
        await new Promise(setImmediate);

        // Verify that sendMail was called
        expect(mockSendMail).toHaveBeenCalledTimes(1);
        
        // Verify parameters passed to sendMail
        const callArgs = mockSendMail.mock.calls[0][0];
        expect(callArgs.to).toBe('john@example.com');
        expect(callArgs.subject).toContain('Welcome to Legacy');
        expect(callArgs.html).toContain('John Doe');
        expect(callArgs.html).toContain('42');
    });

    it('should not send an email if the email address is missing in the payload', async () => {
        // Mute console.error just for this test to avoid polluting Jest logs
        jest.spyOn(console, 'error').mockImplementation(() => {});
        
        await registerMailNotifier();

        // Payload without an email address
        const payload = { id: 99, name: 'No Email User' };
        eventBus.emit(eventTypes.USER_CREATED, payload);

        await new Promise(setImmediate);

        // sendMail should not have been called
        expect(mockSendMail).not.toHaveBeenCalled();
    });
});
