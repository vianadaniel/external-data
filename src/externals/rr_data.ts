import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

@Injectable()
export class RRService {
  constructor(private readonly httpService: HttpService) {}

  async getExternalDataIncra(cpfcnpj: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .get(
          `https://api-gateway-v2.registrorural.com.br/incra/busca/cpfcnpj?cpfcnpj=${cpfcnpj}`,
          {
            headers: {
              'X-API-KEY': process.env.API_KEY_RR,
              accept: 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Incra:', error);
    }
  }

  async getExternalDataCar(cpfcnpj: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .get(
          `https://api-gateway-v2.registrorural.com.br/car/busca/cpfcnpj?cpfcnpj=${cpfcnpj}`,
          {
            headers: {
              'X-API-KEY': process.env.API_KEY_RR,
              accept: 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Incra:', error);
    }
  }
}
