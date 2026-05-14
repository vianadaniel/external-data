import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

@Injectable()
export class DdpositivoService {
  private readonly timeout = 120000;

  constructor(private readonly httpService: HttpService) {}

  async search(document: string, consultation: string): Promise<any> {
    const token = process.env.DDPOSITIVO_TOKEN;
    if (!token) {
      return 'error';
    }

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          'https://sistemas.ddpositivo.com/api/search',
          { document, consultation },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeout,
          },
        ),
      );

      return response?.data ?? 'error';
    } catch (error) {
      console.log(error);
      if (isAxiosError(error) && error.response?.data !== undefined) {
        return error.response.data;
      }
      return 'error';
    }
  }
}
