const nodemailer = require('nodemailer');
const eventBus = require('../eventBus');
const eventTypes = require('../eventTypes');

/**
 * Configures an Ethereal test account and subscribes to events to send emails.
 */
async function registerMailNotifier() {
    try {
        let smtpConfig;

        if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            smtpConfig = {
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            };
            console.log('[mailNotifier] Using production SMTP configuration.');
        } else {
            const testAccount = await nodemailer.createTestAccount();
            smtpConfig = {
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            };
            console.log('[mailNotifier] Using Ethereal email transporter (Development mode).');
        }

        const transporter = nodemailer.createTransport(smtpConfig);

        eventBus.on(eventTypes.USER_CREATED, async (payload) => {
            const { id, name, email } = payload;

            if (!email) {
                console.error('[mailNotifier] Cannot send welcome email: user email is missing in payload.');
                return;
            }

            try {
                const info = await transporter.sendMail({
                    from: process.env.SMTP_FROM,
                    to: email,
                    subject: 'Welcome to Legacy! 🚀',
                    text: `Hello ${name || 'New User'},\n\nWelcome to Legacy! 🚀\n\nYour account has been successfully created.\nAccount ID: ${id}\nEmail: ${email}\n\nBest regards,\nThe Legacy Team`,
                    html: `
<div style="font-family: Arial, sans-serif; color: #2d3748; line-height: 1.6; max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
    <h2 style="color: #4a5568; margin-top: 0;">Welcome to Legacy! 🚀</h2>
    <p>Hello <strong>${name || 'New User'}</strong>,</p>
    <p>We are thrilled to welcome you aboard! Your account has been created successfully.</p>
    <div style="background-color: #f7fafc; padding: 16px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5;">
        <p style="margin: 0 0 8px 0;"><strong>Account ID:</strong> ${id}</p>
        <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
    </div>
    <p>Start organizing your tasks and projects today!</p>
    <p style="margin-top: 24px; color: #718096; font-size: 14px;">Best regards,<br><strong>The Legacy Team</strong></p>
</div>
                    `,
                });

                console.log(`[mailNotifier] Welcome email sent to ${email}. MessageId: ${info.messageId}`);
                if (!process.env.SMTP_HOST) {
                    console.log(`[mailNotifier] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
                }
            } catch (error) {
                console.error(`[mailNotifier] Failed to send welcome email to ${email}:`, error);
            }
        });

    } catch (err) {
        console.error('[mailNotifier] Failed to initialize mail notifier:', err);
    }
}

module.exports = registerMailNotifier;