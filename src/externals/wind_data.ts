import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';

import { configDotenv } from 'dotenv';
import { getUfCpfSer } from './common/functions';

configDotenv.apply(process.env);

@Injectable()
export class WindService {
  constructor(private readonly httpService: HttpService) {
    // Configurar timeout padrão de 1 minuto (60000ms) para todas as requisições
    this.httpService.axiosRef.defaults.timeout = 60000;
  }

  async getExternalSearchClientsByPhone(phone: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: '499',
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              DDD: phone.substring(0, 2),
              Telefone: phone.substring(2),
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalVehicleTotal(plate: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: '491',
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              Placa: plate,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalVehicleEssential(plate: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: '569',
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              Placa: plate,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalSearchClientsByName(name: string, uf: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: '500',
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              UF: uf,
              NomeCompleto: name,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalRestritivoSimplesData(
    cpfcnpj: string,
    uf?: string,
  ): Promise<any> {
    const tipoPessoa =
      cpfcnpj.length === 11 ? 'F' : cpfcnpj.length === 14 ? 'J' : null;

    const codigo =
      cpfcnpj.length === 11 ? '493' : cpfcnpj.length === 14 ? '516' : null;

    const estado = cpfcnpj.length === 11 ? getUfCpfSer(cpfcnpj) : uf;

    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: codigo,
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              TipoPessoa: tipoPessoa,
              CPFCNPJ: cpfcnpj,
              UF: estado,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();

      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalRestritivoData(cpfcnpj: string): Promise<any> {
    const tipoPessoa =
      cpfcnpj.length === 11 ? 'F' : cpfcnpj.length === 14 ? 'J' : null;

    const codigo =
      cpfcnpj.length === 11 ? '520' : cpfcnpj.length === 14 ? '521' : null;

    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: codigo,
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              TipoPessoa: tipoPessoa,
              CPFCNPJ: cpfcnpj,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalSearchCars(cpfcnpj: string): Promise<any> {
    const tipoPessoa =
      cpfcnpj.length === 11 ? 'F' : cpfcnpj.length === 14 ? 'J' : null;

    const codigo =
      cpfcnpj.length === 11 ? '503' : cpfcnpj.length === 14 ? '547' : null;

    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: codigo,
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              TipoPessoa: tipoPessoa,
              CPFCNPJ: cpfcnpj,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error(
        'Error fetching data from Wind Search Cars Consultas:',
        error,
      );
    }
  }

  async getExternalBVSData(cpfcnpj: string, uf?: string): Promise<any> {
    const tipoPessoa =
      cpfcnpj.length === 11 ? 'F' : cpfcnpj.length === 14 ? 'J' : null;

    const codigo =
      cpfcnpj.length === 11 ? '522' : cpfcnpj.length === 14 ? '523' : null;

    const estado = cpfcnpj.length === 11 ? getUfCpfSer(cpfcnpj) : uf;

    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: codigo,
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              TipoPessoa: tipoPessoa,
              CPFCNPJ: cpfcnpj,
              UF: estado,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }

  async getExternalSCRData(cpfcnpj: string): Promise<any> {
    const tipoPessoa =
      cpfcnpj.length === 11 ? 'F' : cpfcnpj.length === 14 ? 'J' : null;
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://api.windconsultas.com.br/json/service.aspx',
          {
            CodigoProduto: '496',
            Versao: '20180521',
            ChaveAcesso: process.env.TOKEN_WIND,
            Info: {
              Solicitante: '55676277000120',
            },
            Parametros: {
              TipoPessoa: tipoPessoa,
              CPFCNPJ: cpfcnpj,
            },
            WebHook: {
              UrlCallBack: '',
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 90000, // 90 segundos de timeout
          },
        )
        .toPromise();
      return response.data;
    } catch (error) {
      console.error('Error fetching data from Wind Consultas:', error);
    }
  }
}
