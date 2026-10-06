import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs-extra';
import * as path from 'path';
import { AlertEmailService } from './common/alert-email.service';

@Injectable()
export class SintegraTotalDataService {
  /** Timeout por host — cabe no TIMEOUT_SINTEGRATOTAL (120s) do report se o 1º falhar. */
  private readonly timeout = 90000;
  private readonly urlsFilePath: string;
  private roundRobinIndex = 0;
  private lastHealthAlertAt = 0;
  private readonly healthAlertCooldownMs = 15 * 60 * 1000;

  constructor(
    private readonly httpService: HttpService,
    private readonly alertEmailService: AlertEmailService,
  ) {
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

  private normalizeProxyPath(rawPath: string): string | null {
    const normalized = rawPath.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!normalized) return null;
    const segments = normalized.split('/');
    if (segments.some((seg) => !seg || seg === '.' || seg === '..')) {
      return null;
    }
    return normalized;
  }

  private rotateUrls(urls: string[]): string[] {
    if (urls.length <= 1) return urls;
    const start = this.roundRobinIndex % urls.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % urls.length;
    return [...urls.slice(start), ...urls.slice(0, start)];
  }

  private buildRequestUrl(rawUrl: string, normalizedPath: string): string {
    if (normalizedPath === 'inscricoes') {
      return this.resolveInscricoesUrl(rawUrl);
    }
    return `${this.resolveSintegraOrigin(rawUrl)}/${normalizedPath}`;
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

  /** Falha de infra — tenta o próximo host. Não trata payload de negócio vazio. */
  private isHostFailure(response?: AxiosResponse, error?: unknown): boolean {
    if (error) return true;
    if (!response) return true;
    if (response.status >= 500) return true;
    const data = response.data;
    if (data === undefined || data === null || data === 'error') return true;
    if (this.isHtmlBody(data)) return true;
    return false;
  }

  private async postSintegraTotal(
    path: string,
    body: Record<string, unknown>,
    label: string,
    timeout = this.timeout,
  ): Promise<any> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const normalizedPath = path.replace(/^\//, '');
    const ordered = this.rotateUrls(urls);

    for (let i = 0; i < ordered.length; i++) {
      const url = this.buildRequestUrl(ordered[i], normalizedPath);
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
        if (!this.isHostFailure(response)) {
          return response.data;
        }
        console.error(`SINTEGRA Total ${label} url[${i}] invalid response:`, {
          url,
          status: response.status,
        });
      } catch (error) {
        console.error(`SINTEGRA Total ${label} url[${i}] failed:`, {
          url,
          message: this.getErrorMessage(error),
        });
      }
    }
    return 'error';
  }

  async addUrl(url: string | string[]): Promise<void> {
    const incoming = Array.isArray(url) ? url : [url];
    await this.setUrls(incoming);
  }

  async setUrls(urls: string[]): Promise<void> {
    const seen = new Set<string>();
    const normalized: string[] = [];
    for (const raw of urls) {
      if (typeof raw !== 'string' || !raw.trim()) continue;
      const origin = this.resolveSintegraOrigin(raw.trim());
      if (seen.has(origin)) continue;
      seen.add(origin);
      normalized.push(origin);
    }
    if (normalized.length === 0) {
      throw new Error('Nenhuma URL válida');
    }
    this.roundRobinIndex = 0;
    await this.saveUrlsToFile(normalized);
  }

  async getUrls(): Promise<string[]> {
    return this.readUrlsFromFile();
  }

  async deleteAllUrls(): Promise<void> {
    await this.saveUrlsToFile([]);
  }

  async proxyPost(
    path: string,
    body: Record<string, unknown> = {},
  ): Promise<any> {
    const normalizedPath = this.normalizeProxyPath(path);
    if (!normalizedPath) return 'error';
    return this.postSintegraTotal(normalizedPath, body, `proxy ${normalizedPath}`);
  }

  async proxyGet(path: string): Promise<any> {
    const normalizedPath = this.normalizeProxyPath(path);
    if (!normalizedPath) return 'error';

    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    const ordered = this.rotateUrls(urls);
    for (let i = 0; i < ordered.length; i++) {
      const url = this.buildRequestUrl(ordered[i], normalizedPath);
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.get(url, {
            timeout: this.timeout,
            headers: { 'User-Agent': 'Report/1.0' },
            validateStatus: () => true,
          }),
        );
        if (!this.isHostFailure(response)) {
          return response.data;
        }
        console.error(`SINTEGRA Total proxy GET url[${i}] invalid response:`, {
          url,
          status: response.status,
        });
      } catch (error) {
        console.error(`SINTEGRA Total proxy GET url[${i}] failed:`, {
          url,
          message: this.getErrorMessage(error),
        });
      }
    }
    return 'error';
  }

  private isHealthySintegraBody(data: unknown): boolean {
    const text =
      typeof data === 'string'
        ? data
        : data != null && typeof data === 'object'
          ? JSON.stringify(data)
          : String(data ?? '');
    return text.toLowerCase().includes('sintegra total is working');
  }

  async getHealth(): Promise<string> {
    const urls = await this.readUrlsFromFile();
    if (urls.length === 0) {
      this.notifyHealthFailure(['nenhuma url configurada'], [], []);
      return 'nenhuma url configurada';
    }

    const ok: string[] = [];
    const failed: string[] = [];
    let healthyBody = 'sintegra total is working';

    for (const rawUrl of urls) {
      const origin = this.resolveSintegraOrigin(rawUrl);
      const url = `${origin}/health`;
      try {
        const response: AxiosResponse = await firstValueFrom(
          this.httpService.get(url, {
            timeout: 5000,
            headers: { 'User-Agent': 'Report/1.0' },
            validateStatus: () => true,
          }),
        );
        if (
          response.status >= 200 &&
          response.status < 300 &&
          this.isHealthySintegraBody(response.data)
        ) {
          ok.push(origin);
          if (typeof response.data === 'string') {
            healthyBody = response.data;
          }
        } else {
          failed.push(
            `${origin} -> HTTP ${response.status} ${String(response.data ?? '').slice(0, 80)}`,
          );
        }
      } catch (error) {
        const reason =
          isAxiosError(error) && error.response?.status !== undefined
            ? `HTTP ${error.response.status}`
            : this.getErrorMessage(error);
        failed.push(`${origin} -> ${reason}`);
      }
    }

    if (failed.length > 0) {
      this.notifyHealthFailure(failed, ok, urls);
    }

    if (ok.length > 0) {
      return healthyBody;
    }
    return failed.join('; ') || 'error';
  }

  private notifyHealthFailure(
    failed: string[],
    ok: string[],
    configured: string[],
  ): void {
    const now = Date.now();
    if (now - this.lastHealthAlertAt < this.healthAlertCooldownMs) {
      return;
    }
    this.lastHealthAlertAt = now;
    void this.alertEmailService.sendSintegraHealthAlert(failed, ok, configured);
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

  async getIbamaEmbargosData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal(
      'ibama/embargos',
      { fiscal_number },
      'IBAMA embargos',
    );
  }

  async getIbamaCndData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal(
      'ibama/cnd',
      { fiscal_number },
      'IBAMA CND',
    );
  }

  async getOsintCnpjData(cnpj: string): Promise<any> {
    return this.postSintegraTotal('api/osint/cnpj', { cnpj }, 'OSINT CNPJ');
  }

  async getCarGovConsultaData(codigo: string): Promise<any> {
    return this.postSintegraTotal(
      'car-gov/consulta',
      { codigo },
      'CAR Gov consulta',
    );
  }

  async getTjrrProjudiConsultaData(
    fiscal_number: string,
    page: number,
  ): Promise<any> {
    return this.postSintegraTotal(
      'tjrr-projudi/consulta',
      { fiscal_number, page },
      'TJRR Projudi consulta',
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

  async getSefazEsData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-es', { fiscal_number }, 'SEFAZ ES');
  }

  async getSefazMaData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-ma', { fiscal_number }, 'SEFAZ MA');
  }

  async getSefazRnData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-rn', { fiscal_number }, 'SEFAZ RN');
  }

  async getSefazRoData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-ro', { fiscal_number }, 'SEFAZ RO');
  }

  async getSefazRrData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-rr', { fiscal_number }, 'SEFAZ RR');
  }

  async getSefazRjData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-rj', { fiscal_number }, 'SEFAZ RJ');
  }

  async getSefazRsData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-rs', { fiscal_number }, 'SEFAZ RS');
  }

  async getSefazScData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-sc', { fiscal_number }, 'SEFAZ SC');
  }

  async getSefazSeData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-se', { fiscal_number }, 'SEFAZ SE');
  }

  async getSefazPeData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-pe', { fiscal_number }, 'SEFAZ PE');
  }

  async getSefazPbData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-pb', { fiscal_number }, 'SEFAZ PB');
  }

  async getSefazSpData(fiscal_number: string): Promise<any> {
    return this.postSintegraTotal('sefaz-sp', { fiscal_number }, 'SEFAZ SP');
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

  async getBiografiaData(
    nome: string,
    ocupacao?: string,
    lugares?: string[],
  ): Promise<any> {
    const body: Record<string, string | string[]> = { nome };
    if (ocupacao) {
      body.ocupacao = ocupacao;
    }
    if (lugares && lugares.length > 0) {
      body.lugares = lugares;
    }
    return this.postSintegraTotal('api/biografia', body, 'Biografia');
  }
}
