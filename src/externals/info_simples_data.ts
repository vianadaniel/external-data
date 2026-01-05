import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';
import { firstValueFrom } from 'rxjs';

configDotenv.apply(process.env);

@Injectable()
export class InfoSimplesDataService {
  private readonly timeout = 250000; // 250 segundos

  constructor(private readonly httpService: HttpService) {}

  async getExternalData(identifier: string): Promise<any> {
    try {
      // Construir a URL com o identifier e token
      // Verificar se o identifier já contém query parameters
      const separator = identifier.includes('?') ? '&' : '?';
      const url = `https://api.infosimples.com/api/v2/consultas/${identifier}${separator}token=${process.env.TOKEN_INFO_SIMPLES || ''}`;
      console.log('[InfoSimples Service] URL:', url);
      console.log('[InfoSimples Service] Identifier:', identifier);
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Report/1.0',
          },
        }),
      );

      // Validação da resposta
      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error: any) {
      // Tratar erros HTTP (404, 500, etc.)
      if (error.response) {
        console.error(
          `[InfoSimples] Error ${error.response.status}: ${error.response.statusText} for identifier: ${identifier}`,
        );
        // Retornar null em caso de erro para que o código possa tratar
        return 'error';
      }
      // Erro de rede ou outros erros
      console.error(
        `[InfoSimples] Network error for identifier: ${identifier}`,
        error.message,
      );
      return 'error';
    }
  }
}
