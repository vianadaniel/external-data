import { Injectable, OnModuleInit, Optional, Inject } from '@nestjs/common';
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
export class BigDataService implements OnModuleInit {
  private readonly tokenFilePath: string;
  private readonly tokenExpiryHours = 24;

  constructor(
    private readonly httpService: HttpService,
    @Optional() @Inject(LogsService) private readonly logsService?: LogsService,
  ) {
    this.tokenFilePath = this.resolveTokenFilePath();
  }

  async onModuleInit(): Promise<void> {
    await this.ensureTokenStorage();
  }

  private resolveTokenFilePath(): string {
    if (process.env.BIGDATA_TOKEN_PATH) {
      return path.resolve(process.env.BIGDATA_TOKEN_PATH);
    }
    // Em Docker (/app) o processo roda como `node` sem permissão de escrita no cwd
    if (process.env.NODE_ENV === 'production' || process.cwd() === '/app') {
      return path.join(process.cwd(), 'data', 'bigdata-token.json');
    }
    return path.resolve(process.cwd(), 'data', 'bigdata-token.json');
  }

  private async ensureTokenStorage(): Promise<void> {
    await fs.ensureDir(path.dirname(this.tokenFilePath));
  }

  private async ensureTokenFile(): Promise<TokenData> {
    await this.ensureTokenStorage();

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

    return tokenData;
  }

  async saveTokenToFile(tokenData: TokenData, filePath: string): Promise<void> {
    try {
      await this.ensureTokenStorage();
      await fs.writeJson(filePath, tokenData, { spaces: 2 });
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
      await this.ensureTokenStorage();
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
      const tokenData = await this.ensureTokenFile();

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

      const minorMsg =
        response.data?.Status?.date_of_birth_validation?.[0]?.Message;
      if (
        minorMsg ===
        'THIS CPF BELONGS TO A MINOR. DATE OF BIRTH IS NEEDED TO PROCESS REQUEST.'
      ) {
        return 'cpf belongs to a minor';
      }

      const result = response.data?.Result;
      const first = Array.isArray(result) ? result[0] : undefined;

      if (
        first?.BasicData?.TaxIdStatus ===
        'CPF DOES NOT EXIST IN RECEITA FEDERAL DATABASE'
      ) {
        return 'invalid cpf';
      }

      return first ? { ...first, status: response.data?.Status } : 'error';
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
