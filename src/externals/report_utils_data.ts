// report-utils-data.service.ts
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

@Injectable()
export class ReportUtilsDataService {
  private readonly timeout = 200000; // 200 segundos
  private readonly baseUrl = 'https://report-utils-light.mfcheck.com.br/api';

  constructor(private readonly httpService: HttpService) {}

  async getMpspCertidaoCivel(
    fiscal_number: string,
    name: string,
  ): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/mpsp/consulta`,
          {
            fiscal_number: fiscal_number,
            name: name,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response?.data || 'error';
    } catch (error) {
      console.log('Error fetching MPSP Certidão Cível:', error);
      return 'error';
    }
  }

  async getMpspCertidaoCriminal(
    fiscal_number: string,
    name: string,
    birth_date?: string,
    mother_name?: string,
  ): Promise<any> {
    try {
      const payload: any = {
        fiscal_number,
        name,
      };

      // Para CPF, adicionar birth_date e mother_name se disponíveis
      if (fiscal_number.length === 11 && birth_date) {
        payload.birth_date = birth_date;
      }
      if (fiscal_number.length === 11 && mother_name) {
        payload.mother_name = mother_name;
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/mpsp/criminal`, payload, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      );

      return response?.data || 'error';
    } catch (error) {
      console.log('Error fetching MPSP Certidão Criminal:', error);
      return 'error';
    }
  }

  async getEscavadorConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/escavador/consulta`,
          { fiscal_number },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response?.data || 'error';
    } catch (error) {
      console.log('Error fetching Escavador consulta:', error);
      return 'error';
    }
  }

  async getTjmtConsulta(documento: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/tjmt/consulta`,
          { documento: documento },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return response?.data || 'error';
    } catch (error) {
      console.log('Error fetching TJMT consulta:', error);
      return 'error';
    }
  }
}
