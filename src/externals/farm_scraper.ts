import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';
import { firstValueFrom } from 'rxjs';

configDotenv.apply(process.env);

@Injectable()
export class FarmScraperService {
  private readonly timeout = 300000; // 5 minutos

  constructor(private readonly httpService: HttpService) {}

  async getExternalDataGet(identifier: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/${identifier}`,
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

  async getExternalDataPost(
    identifier: string,
    fiscal_number: string,
    birthdate?: string,
  ): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/${identifier}`,
          {
            fiscal_number,
            birthdate,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );
      console.log(response.data);

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getCcirEmission(
    sncr: string,
    estado: string,
    cidade: string,
    fiscal_number: string,
  ): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/ccir/emitir`,
          {
            sncr,
            estado,
            cidade,
            fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getSintegraGoias(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/sintegra/goias`,
          {
            fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getSintegraBahia(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/sintegra/bahia`,
          { fiscal_number },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getSintegraPara(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/sintegra/para`,
          {
            fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getSintegraParana(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/sintegra/parana`,
          {
            fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getPgespConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/pgesp/consulta`,
          {
            fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || !response.data) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjspEsaj(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjsp/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjgoConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjgo/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjprProjudi(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjpr/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTrt2Consulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/trt2/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjscConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjsc/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjmgConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjmg/consulta`,
          {
            documento: fiscal_number,
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjpaConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjpa/consulta`,
          {
            documento: fiscal_number,
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjceConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjce/consulta`,
          {
            documento: fiscal_number,
          },
        ),
      );

      if (!response || response.data.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }
}
