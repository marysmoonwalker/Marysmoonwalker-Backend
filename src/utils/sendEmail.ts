import nodemailer from 'nodemailer';
import 'dotenv/config';

const logger = {
    info: (context: string, message: string) => {
        console.log(`[${new Date().toISOString()}] [INFO] [${context}]: ${message}`);
    },
    error: (context: string, error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        const stack   = error instanceof Error ? error.stack   : undefined;
        console.error(`[${new Date().toISOString()}] [ERROR] [${context}]: ${message}`);
        if (stack) console.error(stack);
    },
};

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '465'),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false,
    },
    connectionTimeout: 10000, 
    greetingTimeout:   10000,
    socketTimeout:     15000,
});

transporter.verify((error) => {
    if (error) {
        logger.error('sendEmail:verify', error);
        logger.error('sendEmail:verify', 'Email service is NOT ready. Check your EMAIL_* env vars and Gmail App Password.');
    } else {
        logger.info('sendEmail:verify', 'Email service is ready');
    }
});

export const sendEmail = async (options: {
    email:   string;
    subject: string;
    html:    string;
}): Promise<void> => {

    const fromName    = process.env.EMAIL_FROM_NAME    ?? 'Marys Moonwalker';
    const fromAddress = process.env.EMAIL_USER!;

    await transporter.sendMail({
        from:    `"${fromName}" <${fromAddress}>`,
        to:      options.email,
        subject: options.subject,
        html:    options.html,
    });

    logger.info('sendEmail', `Email sent to ${options.email} | Subject: "${options.subject}"`);
};