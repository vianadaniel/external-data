// external-api.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

@Injectable()
export class DirectDataService {
  private readonly timeout = 120000; // 2 minutos
  private readonly veiculosTimeout = 600000; // 10 minutos

  constructor(private readonly httpService: HttpService) {}

  private resolveTimeout(identifier: string): number {
    if (identifier.startsWith('ConsultaVeicularFrotasNacional')) {
      return this.veiculosTimeout;
    }
    return this.timeout;
  }

  async getDirectdData(identifier: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(
          `https://apiv3.directd.com.br/api/${identifier}&TOKEN=${process.env.TOKEN_DIRECTD}`,
          {
            timeout: this.resolveTimeout(identifier),
          },
        ),
      );

      return response?.data || 'error';
    } catch (error) {
      console.log(error);
      return 'error';
    }
  }
}
