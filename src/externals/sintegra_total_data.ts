import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError } from 'axios';
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

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return String(error);
  }

  /** Base do sintegra-total (ex.: http://host:3003), ignorando sufixos como /inscricoes. */
  private resolveSintegraOrigin(rawUrl: string): string {
    try {
      return new URL(rawUrl).origin;
    } catch {
      return rawUrl.replace(/\/$/, '');
    }
  }

  private resolveInscricoesUrl(rawUrl: string): string {
    const trimmed = rawUrl.replace(/\/$/, '');
    if (/\/inscricoes$/i.test(trimmed)) return trimmed;
    return `${this.resolveSintegraOrigin(rawUrl)}/inscricoes`;
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

  private async postSintegraTotal(
    path: string,
    body: Record<string, string>,
    label: string,
    timeout = this.timeout,
  ): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const normalizedPath = path.replace(/^\//, '');
    const url =
      normalizedPath === 'inscricoes'
        ? this.resolveInscricoesUrl(urls[0])
        : `${this.resolveSintegraOrigin(urls[0])}/${normalizedPath}`;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.post(url, body, {
            timeout,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Report/1.0',
            },
            validateStatus: () => true,
          }),
        );
        if (response?.data !== undefined && response?.data !== null) {
          return response.data;
        }
      } catch (error) {
        console.error(`SINTEGRA Total ${label} attempt ${attempt} failed:`, {
          url,
          message: this.getErrorMessage(error),
        });
      }
    }
    return 'error';
  }

  async addUrl(url: string): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      const normalized = this.resolveSintegraOrigin(url);
      const filtered = urls.filter(
        (u) => this.resolveSintegraOrigin(u) !== normalized,
      );
      filtered.unshift(normalized);
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
    const url = `${this.resolveSintegraOrigin(urls[0])}/health`;
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

  async getInscricoesData(cpf: string, uf: string): Promise<any> {
    return this.postSintegraTotal('inscricoes', { cpf, uf }, 'Inscrições');
  }

  async getProtestoData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal(
      'protestos',
      { fiscal_number },
      'Protesto',
      320000,
    );
  }

  async getEscavadorConsulta(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal(
      'escavador/consulta',
      { fiscal_number },
      'Escavador consulta',
      400000,
    );
  }

  async getTjtoData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('tjto', { fiscal_number }, 'TJTO');
  }

  async getIbamaData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal(
      'ibama/consulta',
      { fiscal_number },
      'IBAMA',
    );
  }

  async getSefazMgData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-mg', { fiscal_number }, 'SEFAZ MG');
  }

  async getSefazToData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-to', { fiscal_number }, 'SEFAZ TO');
  }

  async getSefazMtData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-mt', { fiscal_number }, 'SEFAZ MT');
  }

  async getSefazPrData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-pr', { fiscal_number }, 'SEFAZ PR');
  }

  async getSefazCeData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-ce', { fiscal_number }, 'SEFAZ CE');
  }

  async getSefazDfData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-df', { fiscal_number }, 'SEFAZ DF');
  }

  async getSefazGoData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-go', { fiscal_number }, 'SEFAZ GO');
  }

  async getRegularidadeFiscalData(
    fiscal_number: string,
    birth_date?: string,
  ): Promise<any> {
    const body: Record<string, string> = { fiscal_number };
    if (birth_date) {
      body.birth_date = birth_date;
    }
    return this.postSintegraTotal(
      'regularidade-fiscal',
      body,
      'Regularidade Fiscal',
    );
  }
}
