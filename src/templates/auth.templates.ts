const baseTemplate = (content: string): string => `
    <div style="
        font-family: 'Georgia', serif;
        background-color: #000000;
        padding: 40px 20px;
        min-height: 100vh;
    ">
        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #0a0a0a;
            border: 1px solid #c9a84c;
            border-radius: 8px;
            overflow: hidden;
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #0a0a0a 0%, #1a1a0a 100%);
                border-bottom: 2px solid #c9a84c;
                padding: 30px 40px;
                text-align: center;
            ">
                <h1 style="
                    color: #c9a84c;
                    font-size: 26px;
                    margin: 0 0 4px 0;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                ">Mary's Moonwalker</h1>
                <p style="
                    color: #8a7a4a;
                    font-size: 12px;
                    margin: 0;
                    letter-spacing: 3px;
                    text-transform: uppercase;
                ">The King of Pop Lives Forever</p>
            </div>

            <!-- Body -->
            <div style="padding: 40px;">
                ${content}
            </div>

            <!-- Footer -->
            <div style="
                border-top: 1px solid #1f1f1f;
                padding: 24px 40px;
                text-align: center;
                background-color: #050505;
            ">
                <p style="color: #5a5a5a; font-size: 12px; margin: 0 0 8px 0;">
                    © ${new Date().getFullYear()} Mary's Moonwalker. All rights reserved.
                </p>
                <a href="https://marys-moonwalker.com" style="
                    color: #c9a84c;
                    font-size: 12px;
                    text-decoration: none;
                    letter-spacing: 1px;
                ">marys-moonwalker.com</a>
            </div>
        </div>
    </div>
`;

const heading = (text: string): string => `
    <h2 style="
        color: #c9a84c;
        font-size: 22px;
        margin: 0 0 20px 0;
        padding-bottom: 12px;
        border-bottom: 1px solid #1f1f1f;
        letter-spacing: 1px;
    ">${text}</h2>
`;

const paragraph = (text: string): string => `
    <p style="
        color: #c8c8c8;
        font-size: 15px;
        line-height: 1.8;
        margin: 0 0 16px 0;
    ">${text}</p>
`;

const otpBox = (otp: string): string => `
    <div style="
        background-color: #0f0f0f;
        border: 1px solid #c9a84c;
        border-radius: 6px;
        padding: 24px;
        text-align: center;
        margin: 28px 0;
    ">
        <p style="
            color: #8a7a4a;
            font-size: 11px;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin: 0 0 12px 0;
        ">Your One-Time Password</p>
        <p style="
            color: #c9a84c;
            font-size: 42px;
            font-weight: bold;
            letter-spacing: 12px;
            margin: 0;
            font-family: 'Courier New', monospace;
        ">${otp}</p>
        <p style="
            color: #5a5a5a;
            font-size: 12px;
            margin: 12px 0 0 0;
        ">This OTP expires in <span style="color: #c9a84c;">10 minutes</span></p>
    </div>
`;

const signature = (): string => `
    <p style="
        color: #8a7a4a;
        font-size: 14px;
        margin: 28px 0 0 0;
        font-style: italic;
        border-top: 1px solid #1f1f1f;
        padding-top: 20px;
    ">With love for the King,<br/>
    <span style="color: #c9a84c; font-style: normal; letter-spacing: 1px;">The Mary's Moonwalker Team</span>
    </p>
`;

/** Welcome email sent after a user successfully verifies their email. */
export const welcomeEmailTemplate = (name: string): string => {
    return baseTemplate(`
        ${heading(`Welcome to the Family, ${name}! 🎤`)}
        ${paragraph(`You have successfully verified your account. We are beyond thrilled to have you join our community of dedicated fans celebrating the legacy of the King of Pop.`)}
        ${paragraph(`Explore exclusive blog posts, relive iconic moments, and connect with fellow Moonwalkers from around the world.`)}
        <div style="text-align: center; margin: 28px 0;">
            <a href="https://marys-moonwalker.com" style="
                display: inline-block;
                background: linear-gradient(135deg, #c9a84c, #f0d080);
                color: #000000;
                text-decoration: none;
                padding: 14px 36px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: bold;
                letter-spacing: 2px;
                text-transform: uppercase;
            ">Start Exploring</a>
        </div>
        ${signature()}
    `);
};

/** OTP email sent during registration for email verification. */
export const otpEmailTemplate = (name: string, otp: string): string => {
    return baseTemplate(`
        ${heading(`Verify Your Email, ${name}`)}
        ${paragraph(`Thank you for joining Mary's Moonwalker. To complete your registration, please use the OTP below to verify your email address.`)}
        ${otpBox(otp)}
        ${paragraph(`If you did not create an account with us, you can safely ignore this email.`)}
        ${signature()}
    `);
};

/** OTP email sent when a user requests a password reset. */
export const passwordResetOtpTemplate = (name: string, otp: string): string => {
    return baseTemplate(`
        ${heading(`Password Reset Request`)}
        ${paragraph(`Hi ${name}, we received a request to reset the password for your Mary's Moonwalker account.`)}
        ${paragraph(`Use the OTP below to reset your password. If you did not request this, please ignore this email — your account remains secure.`)}
        ${otpBox(otp)}
        ${paragraph(`For your security, never share this OTP with anyone.`)}
        ${signature()}
    `);
};