import { Injectable, Optional, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import { configDotenv } from 'dotenv';
import { LogsService } from './logs.service';

configDotenv.apply(process.env);

interface TokenData {
  accessToken: string;
  tokenId: string;
  createdAt: Date;
}

@Injectable()
export class BigDataService {
  private readonly tokenFilePath = path.join(__dirname, 'token.json');
  private readonly tokenExpiryHours = 24;

  constructor(
    private readonly httpService: HttpService,
    @Optional() @Inject(LogsService) private readonly logsService?: LogsService,
  ) {
    this.tokenFilePath = path.resolve(process.cwd(), 'token.json');
  }

  async saveTokenToFile(tokenData: TokenData, filePath: string): Promise<void> {
    try {
      await fs.writeJson(filePath, tokenData, { spaces: 2 });
      this.logsService?.info('BigDataService', 'Token saved to file', {
        data: { tokenId: tokenData.tokenId },
      });
    } catch (error) {
      console.error('Error saving token:', error);
      this.logsService?.error(
        'BigDataService',
        'Error saving token to file',
        error,
      );
    }
  }

  async readTokenFromFile(): Promise<TokenData | null> {
    try {
      const exists = await fs.pathExists(this.tokenFilePath);
      if (!exists) {
        return null;
      }
      const tokenData: TokenData = await fs.readJson(this.tokenFilePath);
      return tokenData;
    } catch (error) {
      console.error('Error reading token from file:', error);
      return null;
    }
  }

  async getToken(): Promise<{ accessToken: string; tokenId: string }> {
    const startTime = Date.now();
    try {
      const response: AxiosResponse = await this.httpService
        .post(
          'https://plataforma.bigdatacorp.com.br/tokens/gerar',
          {
            expires: 25,
            login: process.env.BIGDATA_USER,
            password: process.env.BIGDATA_PASSWORD,
          },
          {
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
            },
          },
        )
        .toPromise();

      const { token, tokenID } = response.data;
      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000; // Converter para segundos

      this.logsService?.info('BigDataService', 'Token fetched successfully', {
        duration,
        data: { tokenId: tokenID },
      });

      return { accessToken: token, tokenId: tokenID };
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000; // Converter para segundos
      console.error('Error fetching token:', error);
      this.logsService?.error('BigDataService', 'Error fetching token', error, {
        duration,
      });
      throw error;
    }
  }

  async getTokenAndSave(): Promise<void> {
    try {
      const { accessToken, tokenId } = await this.getToken();

      const tokenData: TokenData = {
        accessToken,
        tokenId,
        createdAt: new Date(),
      };

      await this.saveTokenToFile(tokenData, this.tokenFilePath);
    } catch (error) {
      console.error('Error getting and saving token:', error);
    }
  }

  private isTokenExpired(tokenData: TokenData): boolean {
    const now = new Date();
    const expirationTime = new Date(tokenData.createdAt);
    expirationTime.setHours(expirationTime.getHours() + this.tokenExpiryHours);
    return now > expirationTime;
  }

  async getExternalDataDirectD(identifier: string): Promise<any> {
    try {
      const response: AxiosResponse = await this.httpService
        .get(
          `https://apiv3.directd.com.br/api/${identifier}&TOKEN=${process.env.TOKEN_DIRECTD}`,
        )
        .toPromise();
      return response.data;
    } catch (error) {}
  }

  async getExternalDataBigData(
    identifier: string,
    fiscal_id_number: string,
    data_set: string,
    car_number?: string,
    uf?: string,
  ): Promise<any> {
    const startTime = Date.now();
    try {
      let tokenData = await this.readTokenFromFile();

      if (!tokenData || this.isTokenExpired(tokenData)) {
        const { accessToken, tokenId } = await this.getToken();
        tokenData = {
          accessToken,
          tokenId,
          createdAt: new Date(),
        };
        await this.saveTokenToFile(tokenData, this.tokenFilePath);
      }

      const response: AxiosResponse = await this.httpService
        .post(
          `https://plataforma.bigdatacorp.com.br/${identifier}`,
          {
            q: car_number
              ? `carnumber{${car_number}}`
              : `doc{${fiscal_id_number}}` + (uf ? `,uf{${uf}}` : ''),
            Datasets: `${data_set}`,
          },
          {
            timeout: 180000, // 3 minutos
            headers: {
              AccessToken: tokenData.accessToken,
              TokenId: tokenData.tokenId,
              accept: 'application/json',
              'content-type': 'application/json',
            },
          },
        )
        .toPromise();

      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000; // Converter para segundos

      if (
        response.data?.Status.date_of_birth_validation?.[0].Message ===
        'THIS CPF BELONGS TO A MINOR. DATE OF BIRTH IS NEEDED TO PROCESS REQUEST.'
      ) {
        this.logsService?.warn('BigDataService', 'CPF belongs to a minor', {
          duration,
          data: { identifier, fiscal_id_number, data_set },
        });
        return 'cpf belongs to a minor';
      }

      if (
        response.data?.Result[0]?.BasicData?.TaxIdStatus ===
        'CPF DOES NOT EXIST IN RECEITA FEDERAL DATABASE'
      ) {
        this.logsService?.warn('BigDataService', 'Invalid CPF', {
          duration,
          data: { identifier, fiscal_id_number, data_set },
        });
        return 'invalid cpf';
      }

      this.logsService?.info('BigDataService', 'Data fetched successfully', {
        duration,
        data: {
          identifier,
          fiscal_id_number,
          data_set,
          hasResult: !!response.data.Result[0],
        },
      });

      return response.data.Result[0]
        ? { ...response.data?.Result[0], status: response.data?.Status }
        : 'error';
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000; // Converter para segundos
      console.error('Error fetching data:', error);
      this.logsService?.error(
        'BigDataService',
        'Error fetching external data',
        error,
        {
          duration,
          data: { identifier, fiscal_id_number, data_set, car_number, uf },
        },
      );
      throw error;
    }
  }
}
