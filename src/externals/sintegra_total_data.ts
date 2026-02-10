import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs-extra';
import * as path from 'path';

interface UrlData {
  url: string;
  errorCount: number;
}

@Injectable()
export class SintegraTotalDataService {
  private readonly timeout = 120000; // 120 segundos
  private readonly retryAttempts = 5;
  private readonly urlsFilePath: string;

  constructor(private readonly httpService: HttpService) {
    this.urlsFilePath = path.resolve(process.cwd(), 'sintegra_urls.json');
  }

  private async readUrlsFromFile(): Promise<UrlData[]> {
    try {
      const exists = await fs.pathExists(this.urlsFilePath);
      if (!exists) {
        // Se o arquivo não existe, cria vazio
        await this.saveUrlsToFile([]);
        return [];
      }
      const urls: any = await fs.readJson(this.urlsFilePath);
      // Migração: se for array de strings, converte para UrlData[]
      if (
        Array.isArray(urls) &&
        urls.length > 0 &&
        typeof urls[0] === 'string'
      ) {
        const migratedUrls: UrlData[] = urls.map((url: string) => ({
          url,
          errorCount: 0,
        }));
        await this.saveUrlsToFile(migratedUrls);
        return migratedUrls;
      }
      return Array.isArray(urls) ? urls : [];
    } catch (error) {
      console.error('Error reading URLs from file:', error);
      return [];
    }
  }

  private async saveUrlsToFile(urls: UrlData[]): Promise<void> {
    try {
      await fs.writeJson(this.urlsFilePath, urls, { spaces: 2 });
    } catch (error) {
      console.error('Error saving URLs to file:', error);
    }
  }

  private async updateUrlErrorCount(
    url: string,
    errorCount: number,
  ): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      const urlIndex = urls.findIndex((u) => u.url === url);
      if (urlIndex !== -1) {
        urls[urlIndex].errorCount = errorCount;
        await this.saveUrlsToFile(urls);
      }
    } catch (error) {
      console.error('Error updating URL error count:', error);
    }
  }

  private async removeUrlFromFile(urlToRemove: string): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      const filteredUrls = urls.filter((u) => u.url !== urlToRemove);
      await this.saveUrlsToFile(filteredUrls);
    } catch (error) {
      console.error('Error removing URL from file:', error);
    }
  }

  async addUrl(url: string): Promise<void> {
    try {
      const urls = await this.readUrlsFromFile();
      if (!urls.some((u) => u.url === url)) {
        urls.push({ url, errorCount: 0 });
        await this.saveUrlsToFile(urls);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
      throw error;
    }
  }

  async getUrls(): Promise<UrlData[]> {
    return await this.readUrlsFromFile();
  }

  async getInscricoesData(cpf: string, uf: string): Promise<any> {
    const urlsData = await this.readUrlsFromFile();
    if (urlsData.length === 0) {
      console.error('SINTEGRA Total: Nenhuma URL disponível');
      return 'error';
    }

    // Tenta cada URL disponível
    for (const urlData of urlsData) {
      const { url } = urlData;
      let errorCount = urlData.errorCount; // Variável local que será atualizada

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const response: AxiosResponse = await firstValueFrom(
            this.httpService.post(
              url,
              {
                cpf,
                uf,
              },
              {
                timeout: this.timeout,
                headers: {
                  'Content-Type': 'application/json',
                  'User-Agent': 'Report/1.0',
                },
              },
            ),
          );

          // Validação da resposta
          if (!response || !response.data) {
            console.error(
              `SINTEGRA Total Attempt ${attempt}: Resposta vazia ou inválida`,
            );
            errorCount++;
            await this.updateUrlErrorCount(url, errorCount);

            if (errorCount >= this.retryAttempts) {
              await this.removeUrlFromFile(url);
              break; // Remove e tenta próxima URL
            }

            if (attempt === this.retryAttempts) {
              break; // Tenta próxima URL
            }
            continue;
          }

          // Sucesso: zera o contador de erros
          if (errorCount > 0) {
            errorCount = 0;
            await this.updateUrlErrorCount(url, 0);
          }

          return response.data;
        } catch (error) {
          errorCount++;
          await this.updateUrlErrorCount(url, errorCount);

          console.error(`SINTEGRA Total Attempt ${attempt} failed:`, {
            message: error?.message,
            code: error?.code,
            cause: error?.cause?.code,
          });

          if (errorCount >= this.retryAttempts) {
            await this.removeUrlFromFile(url);
            break; // Remove e tenta próxima URL
          }

          if (attempt === this.retryAttempts) {
            break; // Tenta próxima URL se houver
          }
        }
      }
    }

    // Se chegou aqui, todas as URLs falharam
    console.error('SINTEGRA Total: Todas as URLs falharam');
    return 'error';
  }
}
