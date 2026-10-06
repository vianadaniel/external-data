import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { AlertEmailService } from './common/alert-email.service';

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
  private readonly timeout = 30000; // 30 segundos

  private readonly producaoUrl =
    'https://servicos.spc.org.br/spcconsulta/recurso/consulta/padrao';

  constructor(
    private readonly httpService: HttpService,
    private readonly alertEmailService: AlertEmailService,
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

  /** Erros de auth/conta que justificam tentar o usuário backup. */
  private shouldRetryWithBackup(errorOrData: any): boolean {
    if (errorOrData == null) {
      return true;
    }

    const status = errorOrData?.response?.status;
    if (status === 401 || status === 403 || status === 429) {
      return true;
    }

    const data = errorOrData?.response?.data ?? errorOrData;
    if (data?.result?.error === 'true' || data?.result?.error === true) {
      return true;
    }

    const codigo = this.getSpcCodigoRetorno(errorOrData);
    if (codigo === '670' || codigo === '401' || codigo === '403') {
      return true;
    }

    const message = this.getSpcErrorMessage(errorOrData).toLowerCase();
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
  ): Promise<SPCResponse | null> {
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

    if (response.status === 401 || response.status === 403) {
      const error = new Error(`SPC HTTP ${response.status}`);
      (error as any).response = response;
      throw error;
    }

    if (response.status < 200 || response.status >= 300) {
      const error = new Error(`SPC HTTP ${response.status}`);
      (error as any).response = response;
      throw error;
    }

    if (response?.data) {
      return response.data;
    }
    return null;
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
    if (!backup || this.isSameCredentials(primary, backup)) {
      return null;
    }

    console.warn(
      `SPC: falha com usuário principal (${reason}), tentando credenciais de backup.`,
    );

    void this.alertEmailService.sendSpcBackupAlert({
      documentoConsumidor: request.documentoConsumidor,
      tipoConsumidor: request.tipoConsumidor,
      codigoProduto: request.codigoProduto,
      reason,
      primaryUsername: primary.username,
      backupUsername: backup.username,
    });

    try {
      const backupResult = await this.callProducao(request, backup);
      if (backupResult && this.shouldRetryWithBackup(backupResult)) {
        this.logProducaoError(backupResult, request, 'backup');
        return null;
      }
      return backupResult;
    } catch (backupError) {
      this.logProducaoError(backupError, request, 'backup');
      return null;
    }
  }

  async consultaProducao(request: SPCRequest): Promise<SPCResponse | null> {
    const primary = this.getPrimaryCredentials();

    try {
      const primaryResult = await this.callProducao(request, primary);

      // HTTP 200 com erro de conta/auth — tenta backup
      if (this.shouldRetryWithBackup(primaryResult)) {
        const backupResult = await this.tryBackup(
          request,
          primary,
          this.getSpcErrorMessage(primaryResult) ||
            this.getSpcCodigoRetorno(primaryResult) ||
            'resposta de erro',
        );
        if (backupResult) {
          return backupResult;
        }
        this.logProducaoError(primaryResult, request, 'principal');
        return null;
      }

      return primaryResult;
    } catch (error) {
      if (this.shouldRetryWithBackup(error)) {
        const backupResult = await this.tryBackup(
          request,
          primary,
          this.getSpcErrorMessage(error) ||
            String(
              (error as any)?.response?.status ??
                (error as any)?.message ??
                'http error',
            ),
        );
        if (backupResult) {
          return backupResult;
        }
      }

      this.logProducaoError(error, request, 'principal');
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
