// external-api.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

@Injectable()
export class EscavadorDataService {
  constructor(private readonly httpService: HttpService) {}

  async getExternalData(identifier: string): Promise<any> {
    try {
      const url = `https://api.escavador.com/api/${identifier}`;

      const response: AxiosResponse = await this.httpService
        .get(url, {
          headers: {
            Authorization: `Bearer ${process.env.TOKEN_ESCAVADOR}`,
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
          },
        })
        .toPromise();

      return response?.data || 'error';
    } catch (error) {
      console.error('Escavador API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
      });
      return 'error';
    }
  }

  async getExternalDataPost(identifier: string): Promise<any> {
    try {
      const url = `https://api.escavador.com/api/${identifier}`;

      const response: AxiosResponse = await this.httpService
        .post(
          url,
          {},
          {
            headers: {
              Authorization: `Bearer ${process.env.TOKEN_ESCAVADOR}`,
              'X-Requested-With': 'XMLHttpRequest',
              Accept: 'application/json',
            },
          },
        )
        .toPromise();

      return response?.data || 'error';
    } catch (error) {
      console.error('Escavador API Error:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
      });
      return 'error';
    }
  }
}
