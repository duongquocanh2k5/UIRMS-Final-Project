import nodemailer from 'nodemailer';
import { env } from '../config/environment';

const PLACEHOLDER_VALUES = new Set([
    'email-cua-ban@gmail.com',
    'your-email@gmail.com',
    'mat-khau-ung-dung',
    'your-email-app-password',
    'your-brevo-api-key',
]);

function isConfiguredValue(value?: string | null): value is string {
    if (!value) return false;
    const cleaned = value.trim().replace(/^["']|["']$/g, '').trim();
    return Boolean(cleaned) && !PLACEHOLDER_VALUES.has(cleaned.toLowerCase());
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildResetEmailContent(code: string, expiryMinutes: number) {
    const subject = '[UIRMS] Mã xác nhận đặt lại mật khẩu / Password Reset Code';
    const text =
        `Mã xác nhận đặt lại mật khẩu UIRMS của bạn là: ${code}. Mã có hiệu lực trong ${expiryMinutes} phút.\n\n` +
        `Your UIRMS password reset code is: ${code}. It is valid for ${expiryMinutes} minutes.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0A9D96; margin-top: 0;">UIRMS · Đặt lại mật khẩu</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Xin chào,<br/>
                Bạn vừa yêu cầu đặt lại mật khẩu tài khoản trên hệ thống <strong>UIRMS</strong>. Mã xác thực (OTP) của bạn là:
            </p>
            <div style="background: #f0fdfa; border: 1px dashed #0A9D96; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f524f;">${escapeHtml(code)}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                Mã này có hiệu lực trong <strong>${expiryMinutes} phút</strong>. Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
                Your UIRMS password reset code is <strong>${escapeHtml(code)}</strong> (valid for ${expiryMinutes} minutes).
            </p>
        </div>
    `;
    return { subject, text, html };
}

function buildVerifyEmailContent(code: string, expiryMinutes: number) {
    const subject = '[UIRMS] Mã xác thực tài khoản / Account Verification Code';
    const text =
        `Mã xác thực tài khoản UIRMS của bạn là: ${code}. Mã có hiệu lực trong ${expiryMinutes} phút.\n\n` +
        `Your UIRMS account verification code is: ${code}. It is valid for ${expiryMinutes} minutes.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0A9D96; margin-top: 0;">UIRMS · Xác thực tài khoản công dân</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Xin chào,<br/>
                Cảm ơn bạn đã sử dụng hệ thống <strong>UIRMS</strong>. Nhập mã OTP dưới đây trên ứng dụng để kích hoạt huy hiệu <strong>Đã xác thực</strong> cho tài khoản của bạn:
            </p>
            <div style="background: #f0fdfa; border: 1px dashed #0A9D96; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
                <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #0f524f;">${escapeHtml(code)}</span>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                Mã này có hiệu lực trong <strong>${expiryMinutes} phút</strong>.
            </p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
                Your UIRMS account verification code is <strong>${escapeHtml(code)}</strong> (valid for ${expiryMinutes} minutes).
            </p>
        </div>
    `;
    return { subject, text, html };
}

function buildStatusUpdateEmailContent(payload: {
    incidentId: number;
    incidentTitle?: string | undefined;
    statusLabel: string;
    message: string;
}) {
    const codeLabel = `#INC-${payload.incidentId}`;
    const subject = `[UIRMS] Cập nhật tiến độ báo cáo ${codeLabel} / Incident Update`;
    const titlePart = payload.incidentTitle ? ` (${payload.incidentTitle})` : '';
    const text =
        `Báo cáo sự cố ${codeLabel}${titlePart} của bạn vừa được cập nhật.\n` +
        `Trạng thái: ${payload.statusLabel}\n` +
        `Nội dung: ${payload.message}\n\n` +
        `Vui lòng mở ứng dụng UIRMS để xem chi tiết hình ảnh và tiến độ xử lý.`;
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0A9D96; margin-top: 0;">UIRMS · Cập nhật tiến độ phản ánh</h2>
            <p style="color: #334155; font-size: 14px; line-height: 1.6;">
                Xin chào,<br/>
                Báo cáo sự cố đô thị <strong>${escapeHtml(codeLabel)}</strong>${payload.incidentTitle ? ` — <strong>${escapeHtml(payload.incidentTitle)}</strong>` : ''} của bạn vừa có cập nhật mới:
            </p>
            <div style="background: #f8fafc; border-left: 4px solid #0A9D96; border-radius: 6px; padding: 14px 16px; margin: 18px 0;">
                <p style="margin: 0 0 6px 0; font-size: 13px; color: #0f524f; font-weight: bold;">
                    Trạng thái / Phân loại: ${escapeHtml(payload.statusLabel)}
                </p>
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                    ${escapeHtml(payload.message)}
                </p>
            </div>
            <p style="color: #64748b; font-size: 13px;">
                Bạn có thể mở ứng dụng <strong>UIRMS</strong> trên điện thoại để xem chi tiết lịch sử xử lý, hình ảnh nghiệm thu và đánh giá chất lượng xử lý.
            </p>
        </div>
    `;
    return { subject, text, html };
}

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    constructor() {
        const smtpHost = env.smtpHost?.trim();
        const smtpPort = env.smtpPort;
        const smtpUser = isConfiguredValue(env.smtpUser) ? env.smtpUser.trim() : null;
        // Google App Passwords are often copied as "xxxx xxxx xxxx xxxx" — strip spaces/quotes automatically
        const smtpPass = isConfiguredValue(env.smtpPass)
            ? env.smtpPass.replace(/['"\s]+/g, '')
            : null;

        if (smtpHost && smtpPort && smtpUser && smtpPass) {
            this.transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: smtpPort === 465,
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 15000,
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
            });
        }
    }

    private async deliverEmail(to: string, subject: string, text: string, html: string, debugContext: string): Promise<boolean> {
        const fromEmail = isConfiguredValue(env.emailFrom)
            ? env.emailFrom.trim()
            : isConfiguredValue(env.smtpUser)
                ? env.smtpUser.trim()
                : 'noreply@uirms.vn';

        // 1. Prefer Brevo HTTPS API when configured (works on all cloud hosts like Render/Railway without port 587 blocks)
        if (isConfiguredValue(env.brevoApiKey)) {
            try {
                const response = await fetch('https://api.brevo.com/v3/smtp/email', {
                    method: 'POST',
                    headers: {
                        'accept': 'application/json',
                        'api-key': env.brevoApiKey.trim(),
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        sender: { name: 'UIRMS Support', email: fromEmail },
                        to: [{ email: to }],
                        subject,
                        textContent: text,
                        htmlContent: html,
                    }),
                });

                if (response.ok) {
                    console.log(`${debugContext} sent via Brevo HTTP API to ${to}`);
                    return true;
                }
                const errBody = await response.text().catch(() => '');
                console.error(`Brevo API error (${response.status}):`, errBody);
            } catch (error) {
                console.error('Brevo HTTP API request failed, falling back to SMTP if available:', error);
            }
        }

        // 2. Fallback to standard Nodemailer SMTP (Gmail App Password or custom SMTP)
        if (!this.transporter) {
            console.error(
                `[EmailService] Chưa cấu hình tài khoản gửi email thật trong backend/.env (${debugContext} -> ${to}).`
            );
            return false;
        }

        try {
            const info = await this.transporter.sendMail({
                from: `"UIRMS Support" <${fromEmail}>`,
                to,
                subject,
                text,
                html,
            });

            console.log(`${debugContext} sent via SMTP:`, info.messageId);
            return true;
        } catch (error) {
            console.error(`Error sending ${debugContext} via SMTP:`, error);
            return false;
        }
    }

    async sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
        const { subject, text, html } = buildResetEmailContent(code, env.otpExpiryMinutes);
        return this.deliverEmail(to, subject, text, html, 'Password reset email');
    }

    async sendEmailVerificationOTP(to: string, code: string): Promise<boolean> {
        const { subject, text, html } = buildVerifyEmailContent(code, env.otpExpiryMinutes);
        return this.deliverEmail(to, subject, text, html, 'Email verification OTP');
    }

    async sendIncidentStatusEmail(
        to: string,
        payload: {
            incidentId: number;
            incidentTitle?: string | undefined;
            statusLabel: string;
            message: string;
        }
    ): Promise<boolean> {
        const { subject, text, html } = buildStatusUpdateEmailContent(payload);
        return this.deliverEmail(to, subject, text, html, `Incident #INC-${payload.incidentId} status email`);
    }
}

export const emailService = new EmailService();

export default emailService;
