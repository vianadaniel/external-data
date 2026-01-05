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

  async getExternalData(identifier: string, query?: any): Promise<any> {
    try {
      // Construir a URL com o identifier
      let url = `https://api.infosimples.com/api/v2/consultas/${identifier}`;

      // Adicionar query parameters se existirem
      const queryParams = new URLSearchParams();
      if (query) {
        Object.keys(query).forEach((key) => {
          queryParams.append(key, query[key]);
        });
      }

      // Adicionar o token
      queryParams.append('token', process.env.TOKEN_INFO_SIMPLES || '');

      // Adicionar os query parameters à URL
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }

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
    } catch (error) {
      return 'error';
    }
  }
}
