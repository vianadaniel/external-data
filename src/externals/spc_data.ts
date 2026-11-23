import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AlertEmailService } from './common/alert-email.service';
import { LogRestritivoService } from './log_restritivo.service';
import {
  LogRestritivoCredential,
  LogRestritivoLevel,
} from './schemas/log_restritivo.schema';

export interface SPCRequest {
  codigoProduto: string;
  tipoConsumidor: 'J' | 'F';
  documentoConsumidor: string;
  codigoInsumoOpcional: number[];
}

export interface SPCResponse {
  codigoRetorno: string;
  mensagemRetorno: string;
  dados?: any;
  source?: 'producao' | 'homologacao';
}

@Injectable()
export class SPCService {
  private readonly timeout = 180000; // 180 segundos (3 min)

  private readonly producaoUrl =
    'https://servicos.spc.org.br/spcconsulta/recurso/consulta/padrao';

  constructor(
    private readonly httpService: HttpService,
    private readonly alertEmailService: AlertEmailService,
    private readonly logRestritivoService: LogRestritivoService,
  ) {}

  private getAuthHeader(username: string, password: string): string {
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    return `Basic ${credentials}`;
  }

  private getPrimaryCredentials(): { username: string; password: string } {
    return {
      username: process.env.SPC_USERNAME || '129664688',
      password: process.env.SPC_PASSWORD || 'Ws@20250722',
    };
  }

  private getBackupCredentials(): {
    username: string;
    password: string;
  } | null {
    const username = process.env.SPC_USERNAME_BACKUP;
    const password = process.env.SPC_PASSWORD_BACKUP;
    if (!username || !password) {
      return null;
    }
    return { username, password };
  }

  private getSpcErrorMessage(errorOrData: any): string {
    const data = errorOrData?.response?.data ?? errorOrData;
    const message =
      data?.result?.message ??
      data?.mensagemRetorno ??
      data?.message ??
      data?.result?.mensagem ??
      '';
    return String(message);
  }

  private getSpcCodigoRetorno(errorOrData: any): string {
    const data = errorOrData?.response?.data ?? errorOrData;
    const codigo =
      data?.codigoRetorno ?? data?.result?.codigo ?? data?.result?.code ?? '';
    return String(codigo).trim();
  }

  private requestMeta(request: SPCRequest) {
    return {
      documentoConsumidor: request.documentoConsumidor,
      tipoConsumidor: request.tipoConsumidor,
      codigoProduto: request.codigoProduto,
      request: {
        codigoProduto: request.codigoProduto,
        tipoConsumidor: request.tipoConsumidor,
        documentoConsumidor: request.documentoConsumidor,
        codigoInsumoOpcional: request.codigoInsumoOpcional,
      },
    };
  }

  private summarizeResponse(data: any): Record<string, any> | undefined {
    if (data == null) return undefined;
    return {
      codigoRetorno: this.getSpcCodigoRetorno(data),
      mensagem:
        this.getSpcErrorMessage(data) ||
        data?.mensagemRetorno ||
        data?.result?.message,
      resultError: data?.result?.error,
      keys: typeof data === 'object' ? Object.keys(data).slice(0, 20) : undefined,
    };
  }

  /** Marca o tempo gasto desde startedAt (ms + sec legível). */
  private elapsed(startedAt: number): {
    durationMs: number;
    durationSec: number;
    label: string;
  } {
    const durationMs = Date.now() - startedAt;
    const durationSec = Number((durationMs / 1000).toFixed(3));
    return {
      durationMs,
      durationSec,
      label: `${durationSec}s (${durationMs}ms)`,
    };
  }

  private durationFields(timing: {
    durationMs: number;
    durationSec: number;
  }): { durationMs: number; durationSec: number } {
    return {
      durationMs: timing.durationMs,
      durationSec: timing.durationSec,
    };
  }

  /**
   * Só autenticação / conta suspensa justificam 2ª chamada (backup).
   * Consulta SPC é cara: NÃO repetir em erro de negócio, timeout, 5xx ou body vazio.
   */
  private shouldRetryWithBackup(errorOrData: any): boolean {
    if (errorOrData == null) {
      return false;
    }

    const status = errorOrData?.response?.status;
    // Timeout / rede sem status: não reenvia (a 1ª pode ter cobrado).
    if (typeof status === 'number') {
      if (status === 401 || status === 403 || status === 429) {
        return true;
      }
      // Demais HTTP (4xx/5xx de negócio ou infra) → não gasta backup.
      if (status < 200 || status >= 300) {
        return false;
      }
    }

    const codigo = this.getSpcCodigoRetorno(errorOrData);
    if (codigo === '670' || codigo === '401' || codigo === '403') {
      return true;
    }

    const message = this.getSpcErrorMessage(errorOrData).toLowerCase();
    if (!message) {
      return false;
    }

    return (
      message.includes('670') ||
      message.includes('acesso suspenso') ||
      message.includes('suspenso temporariamente') ||
      message.includes('credencial') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      (message.includes('usuário') && message.includes('inválido')) ||
      (message.includes('usuario') && message.includes('invalido')) ||
      (message.includes('senha') && message.includes('inválid')) ||
      (message.includes('senha') && message.includes('invalid'))
    );
  }

  private isSameCredentials(
    a: { username: string; password: string },
    b: { username: string; password: string },
  ): boolean {
    return a.username === b.username && a.password === b.password;
  }

  private async callProducao(
    request: SPCRequest,
    credentials: { username: string; password: string },
    credential: LogRestritivoCredential,
  ): Promise<SPCResponse | null> {
    const startedAt = Date.now();
    const base = this.requestMeta(request);

    this.logRestritivoService.persist({
      level: LogRestritivoLevel.INFO,
      event: 'call_start',
      message: `SPC call start (${credential})`,
      ...base,
      credential,
      username: credentials.username,
    });

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(this.producaoUrl, request, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.getAuthHeader(
              credentials.username,
              credentials.password,
            ),
            'User-Agent': 'Report/1.0',
          },
          validateStatus: () => true,
        }),
      );

      const timing = this.elapsed(startedAt);

      if (response.status === 401 || response.status === 403) {
        const error = new Error(`SPC HTTP ${response.status}`);
        (error as any).response = response;
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'call_error',
          message: `SPC HTTP ${response.status} (${credential}) em ${timing.label}`,
          ...base,
          credential,
          username: credentials.username,
          httpStatus: response.status,
          codigoRetorno: this.getSpcCodigoRetorno(response.data),
          reason: this.getSpcErrorMessage(response.data),
          ...this.durationFields(timing),
          response: this.summarizeResponse(response.data),
          error,
        });
        throw error;
      }

      if (response.status < 200 || response.status >= 300) {
        const error = new Error(`SPC HTTP ${response.status}`);
        (error as any).response = response;
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'call_error',
          message: `SPC HTTP ${response.status} (${credential}) em ${timing.label}`,
          ...base,
          credential,
          username: credentials.username,
          httpStatus: response.status,
          codigoRetorno: this.getSpcCodigoRetorno(response.data),
          reason: this.getSpcErrorMessage(response.data),
          ...this.durationFields(timing),
          response: this.summarizeResponse(response.data),
          error,
        });
        throw error;
      }

      if (response?.data) {
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.INFO,
          event: 'call_success',
          message: `SPC HTTP ${response.status} (${credential}) em ${timing.label}`,
          ...base,
          credential,
          username: credentials.username,
          httpStatus: response.status,
          codigoRetorno: this.getSpcCodigoRetorno(response.data),
          reason: this.getSpcErrorMessage(response.data) || undefined,
          ...this.durationFields(timing),
          response: this.summarizeResponse(response.data),
        });
        return response.data;
      }

      this.logRestritivoService.persist({
        level: LogRestritivoLevel.WARN,
        event: 'empty_response',
        message: `SPC resposta vazia (${credential}) em ${timing.label}`,
        ...base,
        credential,
        username: credentials.username,
        httpStatus: response.status,
        ...this.durationFields(timing),
      });
      return null;
    } catch (error) {
      // Erros já logados acima (HTTP); timeout/rede ainda precisam de log.
      if (!(error as any)?.response) {
        const timing = this.elapsed(startedAt);
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'call_error',
          message: `SPC falha de rede/timeout (${credential}) em ${timing.label}`,
          ...base,
          credential,
          username: credentials.username,
          ...this.durationFields(timing),
          reason: (error as any)?.message,
          error,
        });
      }
      throw error;
    }
  }

  private logProducaoError(
    error: any,
    request: SPCRequest,
    label: string,
  ): void {
    console.error(`Erro ao chamar SPC Produção (${label}):`, {
      message: error?.message ?? this.getSpcErrorMessage(error),
      responseData: error?.response?.data ?? error,
      statusCode: error?.response?.status,
      codigoRetorno: this.getSpcCodigoRetorno(error),
      request: {
        codigoProduto: request.codigoProduto,
        tipoConsumidor: request.tipoConsumidor,
        documentoConsumidor: request.documentoConsumidor,
      },
    });
  }

  private async tryBackup(
    request: SPCRequest,
    primary: { username: string; password: string },
    reason: string,
  ): Promise<SPCResponse | null> {
    const backup = this.getBackupCredentials();
    const base = this.requestMeta(request);

    if (!backup || this.isSameCredentials(primary, backup)) {
      this.logRestritivoService.persist({
        level: LogRestritivoLevel.WARN,
        event: 'fallback_unavailable',
        message: 'SPC backup indisponível ou igual à principal',
        ...base,
        credential: 'none',
        reason,
        meta: {
          hasBackup: !!backup,
          sameAsPrimary: backup
            ? this.isSameCredentials(primary, backup)
            : false,
        },
      });
      return null;
    }

    console.warn(
      `SPC: falha com usuário principal (${reason}), tentando credenciais de backup.`,
    );

    this.logRestritivoService.persist({
      level: LogRestritivoLevel.WARN,
      event: 'fallback_attempt',
      message: `SPC tentando backup após: ${reason}`,
      ...base,
      credential: 'backup',
      username: backup.username,
      reason,
      meta: { primaryUsername: primary.username },
    });

    void this.alertEmailService.sendSpcBackupAlert({
      documentoConsumidor: request.documentoConsumidor,
      tipoConsumidor: request.tipoConsumidor,
      codigoProduto: request.codigoProduto,
      reason,
      primaryUsername: primary.username,
      backupUsername: backup.username,
    });

    try {
      const backupResult = await this.callProducao(
        request,
        backup,
        'backup',
      );
      if (backupResult && this.shouldRetryWithBackup(backupResult)) {
        this.logProducaoError(backupResult, request, 'backup');
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'call_error',
          message: 'SPC backup também retornou erro de auth/conta',
          ...base,
          credential: 'backup',
          username: backup.username,
          codigoRetorno: this.getSpcCodigoRetorno(backupResult),
          reason: this.getSpcErrorMessage(backupResult),
          response: this.summarizeResponse(backupResult),
        });
        return null;
      }
      return backupResult;
    } catch (backupError) {
      this.logProducaoError(backupError, request, 'backup');
      return null;
    }
  }

  private notifySpcOutcome(
    request: SPCRequest,
    status: 'success' | 'error',
    credential: 'primary' | 'backup' | 'none',
    detail?: string,
    codigoRetorno?: string,
  ): void {
    void this.alertEmailService.sendSpcOutcomeAlert({
      status,
      documentoConsumidor: request.documentoConsumidor,
      tipoConsumidor: request.tipoConsumidor,
      codigoProduto: request.codigoProduto,
      credential,
      detail,
      codigoRetorno,
    });
  }

  async consultaProducao(request: SPCRequest): Promise<SPCResponse | null> {
    const primary = this.getPrimaryCredentials();
    const base = this.requestMeta(request);
    const startedAt = Date.now();

    this.logRestritivoService.persist({
      level: LogRestritivoLevel.INFO,
      event: 'consulta_start',
      message: 'SPC consulta iniciada',
      ...base,
      credential: 'primary',
      username: primary.username,
    });

    try {
      // Aguarda a principal terminar por completo antes de decidir fallback.
      const primaryResult = await this.callProducao(
        request,
        primary,
        'primary',
      );

      // Body vazio: não cobra 2ª consulta.
      if (primaryResult == null) {
        const timing = this.elapsed(startedAt);
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'consulta_error',
          message: `Resposta vazia da credencial principal (sem fallback) em ${timing.label}`,
          ...base,
          credential: 'primary',
          username: primary.username,
          ...this.durationFields(timing),
        });
        this.notifySpcOutcome(
          request,
          'error',
          'primary',
          'Resposta vazia da credencial principal (sem fallback)',
        );
        return null;
      }

      // Só 2ª chamada se for auth/conta suspensa — nunca em erro de negócio.
      if (this.shouldRetryWithBackup(primaryResult)) {
        const primaryFailReason =
          this.getSpcErrorMessage(primaryResult) ||
          this.getSpcCodigoRetorno(primaryResult) ||
          'resposta de erro';
        const backupResult = await this.tryBackup(
          request,
          primary,
          primaryFailReason,
        );
        const timing = this.elapsed(startedAt);
        if (backupResult) {
          this.logRestritivoService.persist({
            level: LogRestritivoLevel.INFO,
            event: 'consulta_success',
            message: `OK via backup após falha principal: ${primaryFailReason} — total ${timing.label}`,
            ...base,
            credential: 'backup',
            codigoRetorno: this.getSpcCodigoRetorno(backupResult),
            reason: primaryFailReason,
            ...this.durationFields(timing),
            response: this.summarizeResponse(backupResult),
          });
          this.notifySpcOutcome(
            request,
            'success',
            'backup',
            `OK via backup após falha principal: ${primaryFailReason}`,
            this.getSpcCodigoRetorno(backupResult),
          );
          return backupResult;
        }
        this.logProducaoError(primaryResult, request, 'principal');
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.ERROR,
          event: 'consulta_error',
          message: `Principal e backup falharam. Principal: ${primaryFailReason} — total ${timing.label}`,
          ...base,
          credential: 'none',
          codigoRetorno: this.getSpcCodigoRetorno(primaryResult),
          reason: primaryFailReason,
          ...this.durationFields(timing),
          response: this.summarizeResponse(primaryResult),
        });
        this.notifySpcOutcome(
          request,
          'error',
          'none',
          `Principal e backup falharam. Principal: ${primaryFailReason}`,
          this.getSpcCodigoRetorno(primaryResult),
        );
        return null;
      }

      // Erro de negócio / sucesso: não gasta segunda chamada.
      const timing = this.elapsed(startedAt);
      const codigo = this.getSpcCodigoRetorno(primaryResult);
      const msg = this.getSpcErrorMessage(primaryResult);
      if (
        (primaryResult as any)?.result?.error === true ||
        (primaryResult as any)?.result?.error === 'true'
      ) {
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.WARN,
          event: 'fallback_skipped',
          message: `SPC erro de negócio — sem fallback: ${msg || codigo || 'result.error'} — ${timing.label}`,
          ...base,
          credential: 'primary',
          username: primary.username,
          codigoRetorno: codigo,
          reason: msg || 'result.error',
          ...this.durationFields(timing),
          response: this.summarizeResponse(primaryResult),
        });
      }

      this.logRestritivoService.persist({
        level: LogRestritivoLevel.INFO,
        event: 'consulta_success',
        message: `OK com credencial principal — total ${timing.label}`,
        ...base,
        credential: 'primary',
        username: primary.username,
        codigoRetorno: codigo,
        ...this.durationFields(timing),
        response: this.summarizeResponse(primaryResult),
      });
      this.notifySpcOutcome(
        request,
        'success',
        'primary',
        'OK com credencial principal',
        codigo,
      );
      return primaryResult;
    } catch (error) {
      const catchReason =
        this.getSpcErrorMessage(error) ||
        String(
          (error as any)?.response?.status ??
            (error as any)?.message ??
            'http error',
        );

      // Backup só após resposta clara de auth; timeout/5xx não reenviam.
      if (this.shouldRetryWithBackup(error)) {
        const backupResult = await this.tryBackup(
          request,
          primary,
          catchReason,
        );
        const timing = this.elapsed(startedAt);
        if (backupResult) {
          this.logRestritivoService.persist({
            level: LogRestritivoLevel.INFO,
            event: 'consulta_success',
            message: `OK via backup após erro principal: ${catchReason} — total ${timing.label}`,
            ...base,
            credential: 'backup',
            codigoRetorno: this.getSpcCodigoRetorno(backupResult),
            reason: catchReason,
            ...this.durationFields(timing),
            response: this.summarizeResponse(backupResult),
          });
          this.notifySpcOutcome(
            request,
            'success',
            'backup',
            `OK via backup após erro principal: ${catchReason}`,
            this.getSpcCodigoRetorno(backupResult),
          );
          return backupResult;
        }
      } else {
        const timing = this.elapsed(startedAt);
        this.logRestritivoService.persist({
          level: LogRestritivoLevel.WARN,
          event: 'fallback_skipped',
          message: `SPC sem fallback (não é auth/conta): ${catchReason} — ${timing.label}`,
          ...base,
          credential: 'primary',
          username: primary.username,
          httpStatus: (error as any)?.response?.status,
          codigoRetorno: this.getSpcCodigoRetorno(error),
          reason: catchReason,
          ...this.durationFields(timing),
          error,
        });
      }

      const timing = this.elapsed(startedAt);
      this.logProducaoError(error, request, 'principal');
      this.logRestritivoService.persist({
        level: LogRestritivoLevel.ERROR,
        event: 'consulta_error',
        message: `Falha na consulta: ${catchReason} — total ${timing.label}`,
        ...base,
        credential: 'none',
        httpStatus: (error as any)?.response?.status,
        codigoRetorno: this.getSpcCodigoRetorno(error),
        reason: catchReason,
        ...this.durationFields(timing),
        error,
      });
      this.notifySpcOutcome(
        request,
        'error',
        'none',
        `Falha na consulta: ${catchReason}`,
        this.getSpcCodigoRetorno(error),
      );
      return null;
    }
  }

  async consultaPessoaJuridica(
    cnpj: string,
    codigoProduto: string = '695',
    insumos: number[] = [],
  ): Promise<SPCResponse | null> {
    const request: SPCRequest = {
      codigoProduto,
      tipoConsumidor: 'J',
      documentoConsumidor: cnpj,
      codigoInsumoOpcional: insumos,
    };

    const response = await this.consultaProducao(request);

    return response;
  }

  async consultaPessoaFisica(
    cpf: string,
    codigoProduto: string = '695',
    insumos: number[] = [],
  ): Promise<SPCResponse | null> {
    const request: SPCRequest = {
      codigoProduto,
      tipoConsumidor: 'F',
      documentoConsumidor: cpf,
      codigoInsumoOpcional: insumos,
    };

    const response = await this.consultaProducao(request);

    return response;
  }
}
