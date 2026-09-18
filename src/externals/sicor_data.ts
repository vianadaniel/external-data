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

    const errors: string[] = [];
    for (const rawUrl of urls) {
      const url = `${this.resolveOrigin(rawUrl)}/health`;
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Report/1.0' },
            validateStatus: () => true,
          }),
        );
        if (response.status >= 200 && response.status < 300) {
          return response.data;
        }
        errors.push(`${url} -> ${response.status}`);
      } catch (error) {
        if (isAxiosError(error) && error.response?.status !== undefined) {
          errors.push(`${url} -> ${error.response.status}`);
        } else {
          errors.push(`${url} -> ${this.getErrorMessage(error)}`);
        }
      }
    }
    return errors.join('; ') || 'error';
  }

  private isEmptyConsultaBody(data: unknown): boolean {
    if (data == null || data === '') return true;
    if (typeof data === 'string' && data.trim() === '') return true;
    if (Array.isArray(data)) return data.length === 0;
    if (typeof data === 'object') return Object.keys(data).length === 0;
    return false;
  }

  private isHtmlBody(data: unknown): boolean {
    if (typeof data !== 'string') return false;
    const trimmed = data.trim().toLowerCase();
    return (
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.includes('<body')
    );
  }

  private isSicorConsultaPayload(data: unknown): boolean {
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }
    const rec = data as Record<string, unknown>;
    if (rec.success === false || rec.ok === false) return false;
    const payload =
      rec.data != null &&
      typeof rec.data === 'object' &&
      !Array.isArray(rec.data)
        ? (rec.data as Record<string, unknown>)
        : rec;
    return (
      typeof payload.temOperacao === 'boolean' ||
      Array.isArray(payload.operacoes) ||
      Array.isArray(payload.fonte) ||
      typeof payload.total === 'number'
    );
  }

  private isConsultaSuccess(response: AxiosResponse): boolean {
    if (response.status < 200 || response.status >= 300) return false;
    const contentType = String(response.headers?.['content-type'] ?? '');
    if (contentType.includes('text/html')) return false;
    if (this.isHtmlBody(response.data)) return false;
    if (this.isEmptyConsultaBody(response.data)) return true;
    return this.isSicorConsultaPayload(response.data);
  }

  private wrapConsultaSuccess(data: unknown): Record<string, unknown> {
    if (this.isEmptyConsultaBody(data)) {
      return { success: true };
    }
    if (data != null && typeof data === 'object' && !Array.isArray(data)) {
      return { ...(data as Record<string, unknown>), success: true };
    }
    return { success: true, data };
  }

  async getConsulta(cpfCnpj: string): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SICOR: Nenhuma URL disponível');
      return { success: false };
    }

    for (let i = 0; i < urls.length; i++) {
      const url = `${this.resolveOrigin(urls[i])}/v1/consulta`;

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
          if (this.isConsultaSuccess(response)) {
            return this.wrapConsultaSuccess(response.data);
          }
          console.error(
            `SICOR consulta url[${i}] attempt ${attempt} invalid response:`,
            {
              url,
              cpfCnpj,
              status: response.status,
            },
          );
        } catch (error) {
          console.error(
            `SICOR consulta url[${i}] attempt ${attempt} failed:`,
            {
              url,
              cpfCnpj,
              message: this.getErrorMessage(error),
            },
          );
        }
      }
    }
    return { success: false };
  }
}
