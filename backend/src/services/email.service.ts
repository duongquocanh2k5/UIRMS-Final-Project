import nodemailer from 'nodemailer';
import { env } from '../config/environment';

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        if (env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: env.smtpHost,
                port: env.smtpPort,
                secure: env.smtpPort === 465, // true for 465, false for other ports
                auth: {
                    user: env.smtpUser!,
                    pass: env.smtpPass!,
                },
            });
        }
    }

    async sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
        const from = env.emailFrom || `noreply@example.com`;

        if (!this.transporter) {
            // Fallback in dev: log to console
            console.log(`[DEV] Password reset OTP for ${to}: ${code}`);
            return true;
        }

        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject: 'Mã đặt lại mật khẩu',
                text: `Mã đặt lại mật khẩu của bạn là: ${code}. Mã có hiệu lực trong ${env.otpExpiryMinutes} phút.`,
                html: `<p>Mã đặt lại mật khẩu của bạn là: <strong>${code}</strong></p><p>Mã có hiệu lực trong ${env.otpExpiryMinutes} phút.</p>`,
            });

            console.log('Password reset email sent:', info.messageId);
            return true;
        } catch (error) {
            console.error('Error sending password reset email:', error);
            return false;
        }
    }
}

export const emailService = new EmailService();

export default emailService;
