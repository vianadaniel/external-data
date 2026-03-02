import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class SintegraTotalDataService {
  private readonly timeout = 180000; // 180 segundos
  private readonly retryAttempts = 1;
  private readonly urlsFilePath: string;

  constructor(private readonly httpService: HttpService) {
    this.urlsFilePath = path.resolve(process.cwd(), 'sintegra_urls.json');
  }

  private async readUrlsFromFile(): Promise<string[]> {
    try {
      const exists = await fs.pathExists(this.urlsFilePath);
      if (!exists) {
        await this.saveUrlsToFile([]);
        return [];
      }
      const data: unknown = await fs.readJson(this.urlsFilePath);
      if (Array.isArray(data)) {
        const list = data
          .map((u) =>
            typeof u === 'string' ? u : (u as { url?: string })?.url,
          )
          .filter((u): u is string => typeof u === 'string');
        if (list.length > 0 && data.length > 0 && typeof data[0] !== 'string') {
          await this.saveUrlsToFile(list); // migra para novo formato
        }
        return list;
      }
      return [];
    } catch (error) {
      console.error('Error reading URLs from file:', error);
      return [];
    }
  }

  private async saveUrlsToFile(urls: string[]): Promise<void> {
    try {
      await fs.writeJson(this.urlsFilePath, urls, { spaces: 2 });
    } catch (error) {
      console.error('Error saving URLs to file:', error);
    }
  }

  async addUrl(url: string): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      const filtered = urls.filter((u) => u !== url);
      filtered.unshift(url); // nova URL vai para [0]
      await this.saveUrlsToFile(filtered);
    } catch (error) {
      console.error('Error adding URL:', error);
      throw error;
    }
  }

  async getUrls(): Promise<string[]> {
    return this.readUrlsFromFile();
  }

  async deleteAllUrls(): Promise<void> {
    await this.saveUrlsToFile([]);
  }

  async getHealth(): Promise<string> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) return 'nenhuma url configurada';
    const baseUrl = urls[0].replace(/\/$/, '');
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(`${baseUrl}/health`, {
          timeout: 5000,
          headers: { 'User-Agent': 'Report/1.0' },
          validateStatus: () => true,
        }),
      );
      return response.status >= 200 && response.status < 300
        ? response.data
        : response.status.toString();
    } catch (error) {
      return error?.response?.status?.toString() || error?.message || error;
    }
  }

  async getInscricoesData(cpf: string, uf: string): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const baseUrl = urls[0];
    const url = `${baseUrl.replace(/\/$/, '')}/inscricoes`;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.post(
            url,
            { cpf, uf },
            {
              timeout: this.timeout,
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Report/1.0',
              },
            },
          ),
        );
        if (response?.data) return response.data;
      } catch (error) {
        console.error(`SINTEGRA Total Attempt ${attempt} failed:`, {
          url,
          message: error?.message,
        });
      }
    }
    return 'error';
  }

  async getProtestoData(fiscal_number: string): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const baseUrl = urls[0];
    const url = `${baseUrl.replace(/\/$/, '')}/protestos`;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.post(
            url,
            { fiscal_number },
            {
              timeout: 320000,
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Report/1.0',
              },
            },
          ),
        );
        if (response?.data) return response.data;
      } catch (error) {
        console.error(`SINTEGRA Total Protesto Attempt ${attempt} failed:`, {
          url,
          message: error?.message,
        });
      }
    }
    return 'error';
  }

  async getTjtoData(fiscal_number: string): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const baseUrl = urls[0];
    const url = `${baseUrl.replace(/\/$/, '')}/tjto`;
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.post(
            url,
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
        if (response?.data) return response.data;
      } catch (error) {
        console.error(`SINTEGRA Total TJTO Attempt ${attempt} failed:`, {
          url,
          message: error?.message,
        });
      }
    }
    return 'error';
  }
}
