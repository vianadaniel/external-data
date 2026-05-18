import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';

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

  constructor(private readonly httpService: HttpService) {}

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

  private getBackupCredentials(): { username: string; password: string } | null {
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
      '';
    return String(message);
  }

  private shouldRetryWithBackup(error: any): boolean {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return true;
    }

    const message = this.getSpcErrorMessage(error).toLowerCase();
    if (
      message.includes('670') ||
      message.includes('acesso suspenso') ||
      message.includes('suspenso temporariamente')
    ) {
      return true;
    }

    const data = error?.response?.data;
    if (data?.result?.error === 'true' || data?.result?.error === true) {
      return true;
    }

    return false;
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
      }),
    );

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
      message: error.message,
      responseData: error.response?.data,
      statusCode: error.response?.status,
      headers: error.response?.headers,
      stack: error.stack,
      request,
    });
  }

  async consultaProducao(request: SPCRequest): Promise<SPCResponse | null> {
    const primary = this.getPrimaryCredentials();

    try {
      return await this.callProducao(request, primary);
    } catch (error) {
      const backup = this.getBackupCredentials();
      if (this.shouldRetryWithBackup(error) && backup) {
        console.warn(
          'SPC: falha com usuário principal, tentando credenciais de backup.',
        );
        try {
          return await this.callProducao(request, backup);
        } catch (backupError) {
          this.logProducaoError(backupError, request, 'backup');
          return null;
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
