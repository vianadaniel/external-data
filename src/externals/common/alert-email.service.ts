import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export type SpcBackupEmailContext = {
  documentoConsumidor: string;
  tipoConsumidor: string;
  codigoProduto: string;
  reason: string;
  primaryUsername: string;
  backupUsername: string;
};

@Injectable()
export class AlertEmailService {
  private readonly logger = new Logger(AlertEmailService.name);

  constructor(private readonly mailerService: MailerService) {}

  private isConfigured(): boolean {
    return !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);
  }

  private getAlertRecipient(): string {
    return process.env.EMAIL_ALERT_TO || 'daniel@mfcheck.com.br';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async sendSpcBackupAlert(context: SpcBackupEmailContext): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'EMAIL_USER/EMAIL_PASSWORD não configurados; alerta SPC backup não enviado.',
      );
      return;
    }

    const subject = `[External Data SPC] Usando credenciais de backup — ${context.documentoConsumidor}`;
    const text = [
      'O SPC principal falhou e a consulta será feita com o usuário de backup.',
      '',
      `Documento: ${context.documentoConsumidor}`,
      `Tipo: ${context.tipoConsumidor}`,
      `Produto: ${context.codigoProduto}`,
      `Usuário principal: ${context.primaryUsername}`,
      `Usuário backup: ${context.backupUsername}`,
      `Motivo: ${context.reason}`,
      `Ambiente: ${process.env.NODE_ENV || 'unknown'}`,
      'Serviço: external-data',
    ].join('\n');

    try {
      await this.mailerService.sendMail({
        to: this.getAlertRecipient(),
        subject,
        text,
        html: [
          '<p>O SPC <strong>principal</strong> falhou e a consulta será feita com o usuário de <strong>backup</strong> (external-data).</p>',
          `<p>Documento: <strong>${this.escapeHtml(context.documentoConsumidor)}</strong></p>`,
          `<p>Tipo: <strong>${this.escapeHtml(context.tipoConsumidor)}</strong></p>`,
          `<p>Produto: <strong>${this.escapeHtml(context.codigoProduto)}</strong></p>`,
          `<p>Usuário principal: <strong>${this.escapeHtml(context.primaryUsername)}</strong></p>`,
          `<p>Usuário backup: <strong>${this.escapeHtml(context.backupUsername)}</strong></p>`,
          `<p>Motivo: <strong>${this.escapeHtml(context.reason)}</strong></p>`,
          `<p>Ambiente: <strong>${process.env.NODE_ENV || 'unknown'}</strong></p>`,
        ].join(''),
      });
      this.logger.warn(
        `Alerta SPC backup enviado para ${this.getAlertRecipient()} (${context.documentoConsumidor})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erro ao enviar email de alerta SPC backup: ${message}`);
    }
  }

  async sendSintegraHealthAlert(errors: string[], urls: string[]): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'EMAIL_USER/EMAIL_PASSWORD não configurados; alerta Sintegra health não enviado.',
      );
      return;
    }

    const detail = errors.length > 0 ? errors.join('\n') : 'nenhuma url configurada';
    const subject = `[External Data] Sintegra Total health falhou`;
    const text = [
      'O health do Sintegra Total falhou em todos os hosts.',
      '',
      `URLs configuradas: ${urls.length ? urls.join(', ') : '(nenhuma)'}`,
      `Erros: ${detail}`,
      `Ambiente: ${process.env.NODE_ENV || 'unknown'}`,
      'Serviço: external-data',
    ].join('\n');

    try {
      await this.mailerService.sendMail({
        to: this.getAlertRecipient(),
        subject,
        text,
        html: [
          '<p>O <strong>health</strong> do Sintegra Total falhou em todos os hosts (external-data).</p>',
          `<p>URLs configuradas: <strong>${this.escapeHtml(urls.length ? urls.join(', ') : '(nenhuma)')}</strong></p>`,
          `<p>Erros: <strong>${this.escapeHtml(detail)}</strong></p>`,
          `<p>Ambiente: <strong>${process.env.NODE_ENV || 'unknown'}</strong></p>`,
        ].join(''),
      });
      this.logger.warn(
        `Alerta Sintegra health enviado para ${this.getAlertRecipient()}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao enviar email de alerta Sintegra health: ${message}`,
      );
    }
  }
}
