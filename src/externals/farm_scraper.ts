import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';
import { firstValueFrom } from 'rxjs';

configDotenv.apply(process.env);

@Injectable()
export class FarmScraperService {
  private readonly timeout = 300000; // 5 minutos
  private readonly baseUrl =
    process.env.FARM_SCRAPER || 'http://134.65.245.187:3000';

  constructor(private readonly httpService: HttpService) {}

  private stripProxyMetadata(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return {};
    }
    const { company_id, user_id, ...rest } = body as Record<string, unknown>;
    return rest;
  }

  private buildQueryString(query?: Record<string, unknown>): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query || {})) {
      if (key === 'company_id' || key === 'user_id') continue;
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item != null && item !== '') params.append(key, String(item));
        }
      } else if (value != null && value !== '') {
        params.append(key, String(value));
      }
    }
    return params.toString();
  }

  async proxyGet(
    path: string,
    query?: Record<string, unknown>,
  ): Promise<any> {
    const identifier = String(path || '').replace(/^\//, '');
    if (!identifier) return 'error';
    const qs = this.buildQueryString(query);
    const url = `${this.baseUrl}/${identifier}${qs ? `?${qs}` : ''}`;
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          timeout: this.timeout,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Report/1.0',
          },
        }),
      );
      if (!response || response.data === undefined || response.data === null) {
        return 'error';
      }
      return response.data;
    } catch {
      return 'error';
    }
  }

  async proxyPost(path: string, body?: unknown): Promise<any> {
    const identifier = String(path || '').replace(/^\//, '');
    if (!identifier) return 'error';
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/${identifier}`,
          this.stripProxyMetadata(body),
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );
      if (!response || response.data === undefined || response.data === null) {
        return 'error';
      }
      return response.data;
    } catch {
      return 'error';
    }
  }

  async getExternalDataGet(identifier: string): Promise<any> {
    return this.proxyGet(identifier);
  }

  async getExternalDataPost(
    identifier: string,
    fiscal_number: string,
    birthdate?: string,
  ): Promise<any> {
    const body: Record<string, unknown> = { fiscal_number };
    if (birthdate != null && birthdate !== '') {
      body.birthdate = birthdate;
    }
    return this.proxyPost(identifier, body);
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

  async getSicarConsulta(codigo: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/sicar/consulta`,
          { codigo },
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

  async getFgtsConsulta(
    fiscal_number: string,
    birthdate?: string,
  ): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/fgts/consulta`,
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

  async getTjspEproc(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjsp-eproc/consulta`,
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

  async getTjmsConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjms/consulta`,
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

  async getTjmaPje(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjma/consulta`,
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

  async getTjapConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjap/consulta`,
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

  async getTjseConsulta(valor: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjse/consulta`,
          {
            valor: valor,
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

  async getTjbaConsulta(documento: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjba/consulta`,
          {
            documento: documento,
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

  async getTjrjConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjrj/consulta`,
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

  async getTstCndtEmitir(cpfCnpj: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tst/cndt/emitir`,
          { cpfCnpj },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjacConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjac/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjamConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjam/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjroConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjro/consulta`,
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

  async getTjdftConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjdft/consulta`,
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

  async getTjalConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjal/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getTjpeConsulta(documento: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjpe/consulta`,
          { documento },
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

  async getTjrrConsulta(fiscal_number: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/tjrr/consulta`,
          {
            tipo: 'documento',
            valor: fiscal_number,
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }

  async getJurimaisConsulta(documento: string): Promise<any> {
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(
          `${process.env.FARM_SCRAPER || 'http://134.65.245.187:3000'}/jurimais/consulta`,
          { documento },
          {
            timeout: this.timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
          },
        ),
      );

      if (!response || response.data?.sucesso === false) {
        return 'error';
      }

      return response.data;
    } catch (error) {
      return 'error';
    }
  }
}
