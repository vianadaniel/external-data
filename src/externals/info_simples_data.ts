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
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(
          `https://api.infosimples.com/api/v2/consultas/${identifier}&token=${process.env.TOKEN_INFO_SIMPLES}`,
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
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
