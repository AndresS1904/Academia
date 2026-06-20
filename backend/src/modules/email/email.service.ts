import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Elimina credenciales de mensajes de error de nodemailer antes de loggear
function sanitizeError(message: string): string {
  return message
    .replace(/AUTH\s+\S+/gi, 'AUTH [REDACTED]')
    .replace(/535[^\n]*/g, 'Authentication failed')
    .replace(/re_[A-Za-z0-9_]+/g, 're_[REDACTED]');
}

const REQUIRED_SMTP_VARS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
] as const;

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private smtpConfigured = false;
  private smtpMissingVars: string[] = [];
  private smtpFrom: string;

  constructor() {
    this.smtpMissingVars = REQUIRED_SMTP_VARS.filter((v) => !process.env[v]);
    this.smtpConfigured = this.smtpMissingVars.length === 0;
    this.smtpFrom = process.env.SMTP_FROM || 'onboarding@resend.dev';

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.resend.com',
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async onModuleInit() {
    if (!this.smtpConfigured) {
      const missing = this.smtpMissingVars.join(', ');
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          `[EMAIL] Variables SMTP faltantes: ${missing}. ` +
          'Los correos (reset de contraseña, bienvenida) NO funcionarán. ' +
          'Configura estas variables en el entorno de producción.',
        );
      } else {
        this.logger.warn(
          `[EMAIL] Variables SMTP faltantes: ${missing}. ` +
          'Los correos se mostrarán en logs como fallback de desarrollo.',
        );
      }
      return;
    }

    // Advertir si se usa el dominio sandbox de Resend en producción
    if (process.env.NODE_ENV === 'production' && this.smtpFrom.includes('resend.dev')) {
      this.logger.warn(
        '[EMAIL] SMTP_FROM usa el dominio sandbox de Resend (resend.dev). ' +
        'En producción solo entrega a correos verificados en tu cuenta de Resend. ' +
        'Verifica el dominio acae.com.co en resend.com/domains y cambia SMTP_FROM a noreply@acae.com.co.',
      );
    }

    try {
      await this.transporter.verify();
      this.logger.log(
        `[EMAIL] SMTP listo — host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} | from: ${this.smtpFrom}`,
      );
    } catch (err: any) {
      this.logger.error(`[EMAIL] SMTP no pudo conectarse: ${sanitizeError(err.message)}`);
    }
  }

  async sendTest(to: string): Promise<{ success: boolean; message: string; provider?: string }> {
    if (!this.smtpConfigured) {
      return {
        success: false,
        message: `SMTP no configurado. Faltan: ${this.smtpMissingVars.join(', ')}.`,
      };
    }

    try {
      await this.transporter.sendMail({
        from: `"Aprova Test" <${this.smtpFrom}>`,
        to,
        subject: 'Prueba de correo — Aprova',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
            <h2 style="color: #004aad; margin-top: 0;">Correo de prueba</h2>
            <p style="color: #475569;">Este correo confirma que el servidor SMTP de <strong>Aprova</strong> está funcionando correctamente.</p>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0; font-family: monospace; font-size: 13px; color: #64748b;">
              <div>Host: ${escapeHtml(process.env.SMTP_HOST || '')}</div>
              <div>Puerto: ${escapeHtml(process.env.SMTP_PORT || '')}</div>
              <div>Remitente: ${escapeHtml(this.smtpFrom)}</div>
              <div>Destinatario: ${escapeHtml(to)}</div>
              <div>Enviado: ${new Date().toLocaleString('es-CO')}</div>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 0;">Aprova — Plataforma Educativa</p>
          </div>
        `,
      });
      this.logger.log(`[EMAIL] Correo de prueba enviado a ${to}`);
      return {
        success: true,
        message: `Correo enviado correctamente a ${to}`,
        provider: `${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`,
      };
    } catch (error: any) {
      const safe = sanitizeError(error.message);
      this.logger.error(`[EMAIL] Error en prueba a ${to}: ${safe}`);
      return { success: false, message: `Error SMTP: ${safe}` };
    }
  }

  async sendWelcomeCredentials(
    to: string,
    name: string,
    password: string,
    schoolName: string,
  ): Promise<void> {
    if (!this.smtpConfigured) {
      this.logger.warn(
        `[EMAIL] sendWelcomeCredentials omitido — SMTP no configurado (faltan: ${this.smtpMissingVars.join(', ')})`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Credenciales para ${to} → contraseña: ${password}`);
      }
      return;
    }

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    const safeName       = escapeHtml(name);
    const safeSchoolName = escapeHtml(schoolName);
    const safeTo         = escapeHtml(to);
    const safePassword   = escapeHtml(password);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #004aad; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Aprova</h1>
          <p style="color: #cce0ff; margin: 8px 0 0;">Plataforma educativa — ${safeSchoolName}</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">¡Bienvenido/a, ${safeName}!</h2>
          <p style="color: #475569;">Tu institución te ha inscrito en la plataforma <strong>Aprova</strong>. Aquí están tus credenciales de acceso:</p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <div style="margin-bottom: 12px;">
              <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Correo electrónico</span>
              <div style="font-size: 15px; color: #1e293b; margin-top: 4px; font-family: monospace;">${safeTo}</div>
            </div>
            <div>
              <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Contraseña temporal</span>
              <div style="font-size: 18px; color: #004aad; margin-top: 4px; font-family: monospace; font-weight: 700; letter-spacing: 0.1em;">${safePassword}</div>
            </div>
          </div>
          <p style="color: #f59e0b; font-size: 13px; background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 6px;">
            &#9888; Al ingresar por primera vez se te pedirá que cambies esta contraseña.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${loginUrl}"
               style="background: #004aad; color: white; padding: 14px 28px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Ingresar a Aprova
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Si tienes problemas, contacta al administrador de tu institución.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Aprova" <${this.smtpFrom}>`,
        to,
        subject: `Tus credenciales de acceso — ${schoolName}`,
        html,
      });
      this.logger.log(`[EMAIL] Bienvenida enviada a: ${to}`);
    } catch (error: any) {
      this.logger.error(`[EMAIL] Error enviando bienvenida a ${to}: ${sanitizeError(error.message)}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Credenciales para ${to} → contraseña: ${password}`);
      }
    }
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.smtpConfigured) {
      this.logger.warn(
        `[EMAIL] sendPasswordReset omitido — SMTP no configurado (faltan: ${this.smtpMissingVars.join(', ')})`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Reset URL para ${to} → ${resetUrl}`);
      }
      return;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #004aad; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Aprova</h1>
          <p style="color: #cce0ff; margin: 8px 0 0;">Plataforma Educativa</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">Restablece tu contraseña</h2>
          <p style="color: #475569;">Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
          <p style="color: #475569;">Haz clic en el botón a continuación para crear una nueva contraseña. Este enlace expirará en <strong>1 hora</strong>.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}"
               style="background: #004aad; color: white; padding: 14px 28px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Restablecer contraseña
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 13px;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña permanecerá igual.
          </p>
          <p style="color: #94a3b8; font-size: 13px;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetUrl}" style="color: #004aad; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Aprova" <${this.smtpFrom}>`,
        to,
        subject: 'Restablece tu contraseña — Aprova',
        html,
      });
      this.logger.log(`[EMAIL] Reset de contraseña enviado a: ${to}`);
    } catch (error: any) {
      this.logger.error(`[EMAIL] Error enviando reset a ${to}: ${sanitizeError(error.message)}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Reset URL para ${to} → ${resetUrl}`);
      }
    }
  }

  /** Reset administrativo: el SUPER_ADMIN generó una contraseña temporal nueva para un ADMIN */
  async sendAdminPasswordReset(to: string, name: string, tempPassword: string): Promise<void> {
    if (!this.smtpConfigured) {
      this.logger.warn(
        `[EMAIL] sendAdminPasswordReset omitido — SMTP no configurado (faltan: ${this.smtpMissingVars.join(', ')})`,
      );
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Contraseña temporal para ${to} → ${tempPassword}`);
      }
      return;
    }

    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`;
    const safeName     = escapeHtml(name);
    const safeTo       = escapeHtml(to);
    const safePassword = escapeHtml(tempPassword);

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #004aad; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Aprova</h1>
          <p style="color: #cce0ff; margin: 8px 0 0;">Plataforma Educativa</p>
        </div>
        <div style="background: #f8fafc; padding: 32px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0;">
          <h2 style="color: #1e293b; margin-top: 0;">Hola, ${safeName}</h2>
          <p style="color: #475569;">Un administrador de la plataforma restableció tu contraseña. Estas son tus nuevas credenciales temporales:</p>
          <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <div style="margin-bottom: 12px;">
              <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Correo electrónico</span>
              <div style="font-size: 15px; color: #1e293b; margin-top: 4px; font-family: monospace;">${safeTo}</div>
            </div>
            <div>
              <span style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Contraseña temporal</span>
              <div style="font-size: 18px; color: #004aad; margin-top: 4px; font-family: monospace; font-weight: 700; letter-spacing: 0.1em;">${safePassword}</div>
            </div>
          </div>
          <p style="color: #f59e0b; font-size: 13px; background: #fffbeb; border: 1px solid #fde68a; padding: 12px; border-radius: 6px;">
            &#9888; Al ingresar se te pedirá que la cambies de inmediato. Tus sesiones activas anteriores quedaron cerradas.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${loginUrl}"
               style="background: #004aad; color: white; padding: 14px 28px; border-radius: 8px;
                      text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
              Ingresar a Aprova
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Si no esperabas este cambio, contacta de inmediato al soporte de la plataforma.
          </p>
        </div>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Aprova" <${this.smtpFrom}>`,
        to,
        subject: 'Tu contraseña fue restablecida — Aprova',
        html,
      });
      this.logger.log(`[EMAIL] Reset administrativo enviado a: ${to}`);
    } catch (error: any) {
      this.logger.error(`[EMAIL] Error enviando reset administrativo a ${to}: ${sanitizeError(error.message)}`);
      if (process.env.NODE_ENV !== 'production') {
        this.logger.warn(`[DEV] Contraseña temporal para ${to} → ${tempPassword}`);
      }
    }
  }
}
