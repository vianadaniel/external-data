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

  async sendSintegraHealthAlert(
    failed: string[],
    ok: string[],
    configured: string[],
  ): Promise<void> {
    if (!this.isConfigured()) {
      this.logger.warn(
        'EMAIL_USER/EMAIL_PASSWORD não configurados; alerta Sintegra health não enviado.',
      );
      return;
    }

    const failedDetail =
      failed.length > 0 ? failed.join('\n') : 'nenhuma url configurada';
    const subject =
      failed.length === 1
        ? `[External Data] Sintegra Total health falhou — ${failed[0]}`
        : `[External Data] Sintegra Total health falhou (${failed.length} hosts)`;
    const text = [
      'Uma ou mais URLs do Sintegra Total falharam no health.',
      '',
      `URLs que falharam:\n${failedDetail}`,
      `URLs ok: ${ok.length ? ok.join(', ') : '(nenhuma)'}`,
      `URLs configuradas: ${configured.length ? configured.join(', ') : '(nenhuma)'}`,
      `Ambiente: ${process.env.NODE_ENV || 'unknown'}`,
      'Serviço: external-data',
    ].join('\n');

    try {
      await this.mailerService.sendMail({
        to: this.getAlertRecipient(),
        subject,
        text,
        html: [
          '<p>Uma ou mais URLs do <strong>Sintegra Total</strong> falharam no health (external-data).</p>',
          `<p>URLs que falharam:</p><p><strong>${this.escapeHtml(failedDetail)}</strong></p>`,
          `<p>URLs ok: <strong>${this.escapeHtml(ok.length ? ok.join(', ') : '(nenhuma)')}</strong></p>`,
          `<p>URLs configuradas: <strong>${this.escapeHtml(configured.length ? configured.join(', ') : '(nenhuma)')}</strong></p>`,
          `<p>Ambiente: <strong>${process.env.NODE_ENV || 'unknown'}</strong></p>`,
        ].join(''),
      });
      this.logger.warn(
        `Alerta Sintegra health enviado para ${this.getAlertRecipient()} (${failed.join('; ')})`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao enviar email de alerta Sintegra health: ${message}`,
      );
    }
  }
}
