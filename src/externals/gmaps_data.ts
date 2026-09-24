import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface GmapsJobBody {
  name?: string;
  keywords: string[];
  lang?: string;
  zoom?: number;
  lat: string;
  lon: string;
  fast_mode?: boolean;
  radius?: number;
  depth?: number;
  email?: boolean;
  max_time: number;
  proxies?: string[];
  [key: string]: unknown;
}

@Injectable()
export class GmapsDataService {
  private readonly timeout = 20000; // 20 segundos — se falhar, tenta a próxima URL
  private readonly urlsFilePath: string;
  private readonly defaultUrl = 'http://100.121.86.36:8082';

  constructor(private readonly httpService: HttpService) {
    this.urlsFilePath = path.resolve(process.cwd(), 'gmaps_urls.json');
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
      console.error('Error reading GMAPS URLs from file:', error);
      return [this.defaultUrl];
    }
  }

  private async saveUrlsToFile(urls: string[]): Promise<void> {
    try {
      await fs.writeJson(this.urlsFilePath, urls, { spaces: 2 });
    } catch (error) {
      console.error('Error saving GMAPS URLs to file:', error);
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
      console.error('Error adding GMAPS URL:', error);
      throw error;
    }
  }

  async getUrls(): Promise<string[]> {
    return this.readUrlsFromFile();
  }

  async deleteAllUrls(): Promise<void> {
    await this.saveUrlsToFile([]);
  }

  private async request(
    method: 'get' | 'post' | 'delete',
    apiPath: string,
    body?: unknown,
    responseType: 'json' | 'text' = 'json',
  ): Promise<AxiosResponse | null> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('GMAPS: Nenhuma URL disponível');
      return null;
    }

    let lastResponse: AxiosResponse | null = null;
    for (let i = 0; i < urls.length; i++) {
      const url = `${this.resolveOrigin(urls[i])}${apiPath}`;
      try {
        const response = await firstValueFrom(
          this.httpService.request({
            method,
            url,
            data: body,
            timeout: this.timeout,
            responseType,
            headers: {
              accept: responseType === 'text' ? 'text/csv' : 'application/json',
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
            validateStatus: () => true,
          }),
        );
        lastResponse = response;
        if (response.status >= 200 && response.status < 300) {
          return response;
        }
        console.error(`GMAPS url[${i}] invalid response:`, {
          url,
          status: response.status,
        });
      } catch (error) {
        console.error(`GMAPS url[${i}] failed:`, {
          url,
          message: this.getErrorMessage(error),
        });
        if (isAxiosError(error) && error.response) {
          lastResponse = error.response;
        }
      }
    }
    return lastResponse;
  }

  async getHealth(): Promise<string> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) return 'nenhuma url configurada';

    const errors: string[] = [];
    for (const rawUrl of urls) {
      const url = `${this.resolveOrigin(rawUrl)}/api/v1/jobs`;
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Report/1.0' },
            validateStatus: () => true,
          }),
        );
        if (response.status >= 200 && response.status < 300) {
          return 'ok';
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

  async createJob(body: GmapsJobBody): Promise<any> {
    const response = await this.request('post', '/api/v1/jobs', body);
    if (!response) return { success: false };
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    return { success: false, status: response.status, data: response.data };
  }

  async listJobs(): Promise<any> {
    const response = await this.request('get', '/api/v1/jobs');
    if (!response) return { success: false };
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    return { success: false, status: response.status, data: response.data };
  }

  async getJob(id: string): Promise<any> {
    const response = await this.request(
      'get',
      `/api/v1/jobs/${encodeURIComponent(id)}`,
    );
    if (!response) return { success: false };
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    }
    return { success: false, status: response.status, data: response.data };
  }

  async deleteJob(id: string): Promise<any> {
    const response = await this.request(
      'delete',
      `/api/v1/jobs/${encodeURIComponent(id)}`,
    );
    if (!response) return { success: false };
    if (response.status >= 200 && response.status < 300) {
      return response.data ?? { success: true };
    }
    return { success: false, status: response.status, data: response.data };
  }

  async downloadJob(id: string): Promise<any> {
    const response = await this.request(
      'get',
      `/api/v1/jobs/${encodeURIComponent(id)}/download`,
      undefined,
      'text',
    );
    if (!response) return { success: false };
    if (response.status < 200 || response.status >= 300) {
      return { success: false, status: response.status, data: response.data };
    }
    const csv = typeof response.data === 'string' ? response.data : '';
    return { success: true, results: this.parseCsv(csv) };
  }

  private parseCsv(text: string): Record<string, string>[] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cell += char;
        }
        continue;
      }
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else if (char !== '\r') {
        cell += char;
      }
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    if (rows.length === 0) return [];

    const headers = rows[0];
    return rows
      .slice(1)
      .filter((cells) => cells.some((c) => c !== ''))
      .map((cells) => {
        const record: Record<string, string> = {};
        headers.forEach((header, index) => {
          record[header] = cells[index] ?? '';
        });
        return record;
      });
  }
}
