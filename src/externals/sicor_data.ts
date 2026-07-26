import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class SicorDataService {
  private readonly timeout = 180000;
  private readonly retryAttempts = 1;
  private readonly urlsFilePath: string;
  private readonly defaultUrl = 'http://100.121.86.36:3000';

  constructor(private readonly httpService: HttpService) {
    this.urlsFilePath = path.resolve(process.cwd(), 'sicor_urls.json');
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private resolveOrigin(rawUrl: string): string {
    try {
      return new URL(rawUrl).origin;
    } catch {
      return rawUrl.replace(/\/$/, '');
    }
  }

  private async readUrlsFromFile(): Promise<string[]> {
    try {
      const exists = await fs.pathExists(this.urlsFilePath);
      if (!exists) {
        await this.saveUrlsToFile([this.defaultUrl]);
        return [this.defaultUrl];
      }
      const data: unknown = await fs.readJson(this.urlsFilePath);
      if (Array.isArray(data)) {
        const list = data
          .map((u) =>
            typeof u === 'string' ? u : (u as { url?: string })?.url,
          )
          .filter((u): u is string => typeof u === 'string');
        if (list.length === 0) {
          return [this.defaultUrl];
        }
        return list;
      }
      return [this.defaultUrl];
    } catch (error) {
      console.error('Error reading SICOR URLs from file:', error);
      return [this.defaultUrl];
    }
  }

  private async saveUrlsToFile(urls: string[]): Promise<void> {
    try {
      await fs.writeJson(this.urlsFilePath, urls, { spaces: 2 });
    } catch (error) {
      console.error('Error saving SICOR URLs to file:', error);
    }
  }

  async addUrl(url: string): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      const normalized = this.resolveOrigin(url);
      const filtered = urls.filter((u) => this.resolveOrigin(u) !== normalized);
      filtered.unshift(normalized);
      await this.saveUrlsToFile(filtered);
    } catch (error) {
      console.error('Error adding SICOR URL:', error);
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
    const url = `${this.resolveOrigin(urls[0])}/health`;
    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(url, {
          timeout: 5000,
          headers: { 'User-Agent': 'Report/1.0' },
          validateStatus: () => true,
        }),
      );
      return response.status >= 200 && response.status < 300
        ? response.data
        : response.status.toString();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status !== undefined) {
        return error.response.status.toString();
      }
      return this.getErrorMessage(error);
    }
  }

  async getConsulta(cpfCnpj: string): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SICOR: Nenhuma URL disponível');
      return 'error';
    }

    const baseUrl = this.resolveOrigin(urls[0]);
    const url = `${baseUrl}/v1/consulta`;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.get(url, {
            params: { cpfCnpj },
            timeout: this.timeout,
            headers: {
              accept: 'application/json',
              'User-Agent': 'Report/1.0',
            },
            validateStatus: () => true,
          }),
        );
        if (response?.data !== undefined && response?.data !== null) {
          return response.data;
        }
      } catch (error) {
        console.error(`SICOR consulta attempt ${attempt} failed:`, {
          url,
          cpfCnpj,
          message: this.getErrorMessage(error),
        });
      }
    }
    return 'error';
  }
}
