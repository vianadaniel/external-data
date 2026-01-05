import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';

configDotenv.apply(process.env);

interface GravameData {
  MensagemRetorno: string;
  StatusRetorno: string;
  ParametroPesquisa: string;
  TipoParametro: string;
  ObjetoRetorno: {
    Protocolo: number;
    Chassi: string;
    Placa: string;
    Renavam: string;
    AnoFabricacao: string;
    AnoModelo: string;
    UfPlaca: string;
    StatusVeiculo: string;
    NomeFinanciado: string;
    DocumentoFinanciado: string;
    NomeAgente: string;
    DocumentoAgente: string;
    NumeroContrato: string;
    DataContrato: string;
    DataGravame: string;
    UfGravame: string;
    DataVigencia: string;
  };
}

@Injectable()
export class CheckProService {
  constructor(private readonly httpService: HttpService) {}
  public TIMEOUT = 180000; // 3 minutos

  async getGravameData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaGravamePorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaGravameSimples';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getBinNacionalData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaBaseNacionalPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaBaseNacionalPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getBinEstadualData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaBaseEstadualPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaBaseEstadualPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getAddressData(cpf_cnpj: string): Promise<any | null> {
    try {
      const url =
        'https://ws2.checkpro.com.br/servicejson.asmx/LocalizaCpfCnpj';

      const params = {
        cpfUsuario: process.env.CHECKPRO_USER,
        senhaUsuario: process.env.CHECKPRO_PASSWORD,
        cpfcnpj: cpf_cnpj,
      };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
      });
      return null;
    }
  }

  async getPriceData(placa: string): Promise<any | null> {
    try {
      const url =
        'https://ws2.checkpro.com.br/servicejson.asmx?op=ConsultaPrecificadorPorPlaca';

      const params = {
        cpfUsuario: process.env.CHECKPRO_USER,
        senhaUsuario: process.env.CHECKPRO_PASSWORD,
        placa: placa,
      };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getLeilaoData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaLeilaoPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaLeilaoPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getLeilaoSimplesData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaLeilaoSimplesPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaLeilaoSimplesPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getSinistroData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaINDSISPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaINDSISPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getRenainfData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaRenainfPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaRenainfPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getHistoricoProprietariosData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaHistoricoProprietarioPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaHistoricoProprietarioPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }

  async getRemarketingData(
    placa: string,
    chassi: string,
  ): Promise<GravameData | null> {
    try {
      const url = placa
        ? 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaRemarketingAutomotivoPorPlaca'
        : 'https://ws2.checkpro.com.br/servicejson.asmx/ConsultaRemarketingAutomotivoPorChassi';
      const params = placa
        ? {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            placa: placa,
          }
        : {
            cpfUsuario: process.env.CHECKPRO_USER,
            senhaUsuario: process.env.CHECKPRO_PASSWORD,
            chassi: chassi,
          };

      const response: AxiosResponse = await this.httpService
        .get(url, { params, timeout: this.TIMEOUT })
        .toPromise();

      if (response?.data) {
        if (!response.data.StatusRetorno) {
          console.error(
            'StatusRetorno não encontrado na resposta:',
            response.data,
          );
          return null;
        }
        return response.data;
      }
      return null;
    } catch (error) {
      console.error('Erro ao chamar CheckPro:', {
        message: error.message,
        responseData: error.response?.data,
        statusCode: error.response?.status,
        headers: error.response?.headers,
        stack: error.stack,
        placa,
      });
      return null;
    }
  }
}
