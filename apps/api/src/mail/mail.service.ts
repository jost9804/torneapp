import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Sends transactional email through Resend. Without RESEND_API_KEY (local development)
 * the message is written to the log instead, so the code can still be read there.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send({
    to,
    subject,
    html,
    text,
  }: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      this.logger.warn(
        `RESEND_API_KEY not set; email to ${to} not sent. ${subject}: ${text}`,
      );
      return;
    }
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'TorneApp <no-reply@torneapp.app>',
        to,
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      this.logger.error(
        `Resend answered ${response.status}: ${await response.text()}`,
      );
      throw new ServiceUnavailableException(
        'No pudimos enviar el correo. Inténtalo de nuevo en unos minutos.',
      );
    }
  }

  /** The 6-digit confirmation code, in plain text and a simple branded HTML. */
  sendVerificationCode(
    to: string,
    name: string,
    code: string,
    minutes: number,
  ) {
    const text = `Hola, ${name}. Tu código para confirmar tu correo en TorneApp es ${code}. Vence en ${minutes} minutos. Si no creaste una cuenta, ignora este mensaje.`;
    const html = `<!doctype html>
<html lang="es"><body style="margin:0;background:#F4F6F3;font-family:Arial,Helvetica,sans-serif;color:#10243E">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <div style="background:#1F5C4A;color:#F4F6F3;padding:16px 24px;border-radius:12px 12px 0 0;font-size:20px;font-weight:bold">TorneApp</div>
    <div style="background:#FFFFFF;padding:24px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 16px">Hola, ${escapeHtml(name)}.</p>
      <p style="margin:0 0 16px">Este es tu código para confirmar tu correo:</p>
      <p style="margin:0 0 16px;font-size:36px;letter-spacing:8px;font-weight:bold;color:#B53A0C">${code}</p>
      <p style="margin:0 0 8px;color:#56657A;font-size:14px">Vence en ${minutes} minutos.</p>
      <p style="margin:0;color:#56657A;font-size:14px">Si no creaste una cuenta en TorneApp, ignora este mensaje.</p>
    </div>
  </div>
</body></html>`;
    return this.send({
      to,
      subject: `${code} es tu código de TorneApp`,
      html,
      text,
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
