import nodemailer from 'nodemailer';
import type { Logger } from 'pino';
import type { Config } from '../../config/env.js';
export interface Mailer {
  send(to: string, subject: string, text: string): Promise<void>;
}
/**
 * Best-effort transactional email (company approved/rejected, claim decided, trial
 * granted). Never blocks or fails the action it's attached to — a broken SMTP config
 * should not stop an admin from approving a company. Silently disabled when SMTP_HOST
 * is empty, matching MERCADO_PAGO_ACCESS_TOKEN's graceful-degradation pattern.
 */
export class SmtpMailer implements Mailer {
  private transport;
  constructor(
    private config: Config,
    private logger: Logger,
  ) {
    this.transport = config.SMTP_HOST
      ? nodemailer.createTransport({
          host: config.SMTP_HOST,
          port: config.SMTP_PORT,
          secure: config.SMTP_PORT === 465,
          auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined,
        })
      : null;
  }
  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.info({ to, subject }, 'SMTP not configured; skipping transactional email');
      return;
    }
    try {
      await this.transport.sendMail({ from: this.config.SMTP_FROM, to, subject, text });
    } catch (error) {
      // Email delivery failing must never roll back or fail the underlying action.
      this.logger.error({ err: error, to, subject }, 'Failed to send transactional email');
    }
  }
}
