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

  private getAuthHeader(): string {
    const username = process.env.SPC_USERNAME || '129664688';
    const password = process.env.SPC_PASSWORD || 'Ws@20250722';
    const credentials = Buffer.from(`${username}:${password}`).toString(
      'base64',
    );
    return `Basic ${credentials}`;
  }

  async consultaProducao(request: SPCRequest): Promise<SPCResponse | null> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(this.producaoUrl, request, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.getAuthHeader(),
            'User-Agent': 'Report/1.0',
          },
        }),
      );

      if (response?.data) {
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar SPC Produção:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        request,
      });
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
