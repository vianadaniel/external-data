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
  private readonly timeout = 190000; // 190 segundos
  private readonly retryAttempts = 3;
  private readonly urlsFilePath: string;

  constructor(private readonly httpService: HttpService) {
    console.log('[SintegraTotalDataService] Constructor iniciado');
    this.urlsFilePath = path.resolve(process.cwd(), 'sintegra_urls.json');
    console.log(
      '[SintegraTotalDataService] urlsFilePath definido:',
      this.urlsFilePath,
    );
    console.log('[SintegraTotalDataService] timeout:', this.timeout);
    console.log(
      '[SintegraTotalDataService] retryAttempts:',
      this.retryAttempts,
    );
    console.log('[SintegraTotalDataService] Constructor finalizado');
  }

  private async readUrlsFromFile(): Promise<UrlData[]> {
    console.log('[readUrlsFromFile] Iniciando leitura do arquivo');
    console.log('[readUrlsFromFile] urlsFilePath:', this.urlsFilePath);
    try {
      const exists = await fs.pathExists(this.urlsFilePath);
      console.log('[readUrlsFromFile] Arquivo existe?', exists);
      if (!exists) {
        // Se o arquivo não existe, cria vazio
        console.log('[readUrlsFromFile] Arquivo não existe, criando vazio');
        await this.saveUrlsToFile([]);
        console.log('[readUrlsFromFile] Arquivo vazio criado, retornando []');
        return [];
      }
      console.log('[readUrlsFromFile] Lendo conteúdo do arquivo...');
      const urls: any = await fs.readJson(this.urlsFilePath);
      console.log('[readUrlsFromFile] Conteúdo lido:', urls);
      console.log('[readUrlsFromFile] Tipo do conteúdo:', typeof urls);
      console.log('[readUrlsFromFile] É array?', Array.isArray(urls));
      // Migração: se for array de strings, converte para UrlData[]
      if (
        Array.isArray(urls) &&
        urls.length > 0 &&
        typeof urls[0] === 'string'
      ) {
        console.log(
          '[readUrlsFromFile] Detectado array de strings, migrando...',
        );
        const migratedUrls: UrlData[] = urls.map((url: string) => ({
          url,
          errorCount: 0,
        }));
        console.log('[readUrlsFromFile] URLs migradas:', migratedUrls);
        await this.saveUrlsToFile(migratedUrls);
        console.log('[readUrlsFromFile] Migração salva no arquivo');
        return migratedUrls;
      }
      const result = Array.isArray(urls) ? urls : [];
      console.log('[readUrlsFromFile] Retornando:', result);
      return result;
    } catch (error) {
      console.error('[readUrlsFromFile] Error reading URLs from file:', error);
      console.error('[readUrlsFromFile] error.message:', error?.message);
      console.error('[readUrlsFromFile] error.stack:', error?.stack);
      return [];
    }
  }

  private async saveUrlsToFile(urls: UrlData[]): Promise<void> {
    console.log('[saveUrlsToFile] Iniciando salvamento');
    console.log('[saveUrlsToFile] urlsFilePath:', this.urlsFilePath);
    console.log('[saveUrlsToFile] URLs a salvar:', urls);
    console.log('[saveUrlsToFile] Total de URLs:', urls.length);
    try {
      await fs.writeJson(this.urlsFilePath, urls, { spaces: 2 });
      console.log('[saveUrlsToFile] Arquivo salvo com sucesso');
    } catch (error) {
      console.error('[saveUrlsToFile] Error saving URLs to file:', error);
      console.error('[saveUrlsToFile] error.message:', error?.message);
      console.error('[saveUrlsToFile] error.stack:', error?.stack);
    }
  }

  private async updateUrlErrorCount(
    url: string,
    errorCount: number,
  ): Promise<void> {
    console.log('[updateUrlErrorCount] Iniciando atualização');
    console.log('[updateUrlErrorCount] url:', url);
    console.log('[updateUrlErrorCount] errorCount:', errorCount);
    try {
      const urls = await this.readUrlsFromFile();
      console.log('[updateUrlErrorCount] URLs lidas:', urls);
      const urlIndex = urls.findIndex((u) => u.url === url);
      console.log('[updateUrlErrorCount] urlIndex encontrado:', urlIndex);
      if (urlIndex !== -1) {
        console.log(
          '[updateUrlErrorCount] URL encontrada, atualizando errorCount',
        );
        console.log(
          '[updateUrlErrorCount] errorCount anterior:',
          urls[urlIndex].errorCount,
        );
        urls[urlIndex].errorCount = errorCount;
        console.log(
          '[updateUrlErrorCount] errorCount atualizado para:',
          errorCount,
        );
        await this.saveUrlsToFile(urls);
        console.log('[updateUrlErrorCount] Arquivo salvo com sucesso');
      } else {
        console.log('[updateUrlErrorCount] URL não encontrada no arquivo');
      }
    } catch (error) {
      console.error(
        '[updateUrlErrorCount] Error updating URL error count:',
        error,
      );
      console.error('[updateUrlErrorCount] error.message:', error?.message);
      console.error('[updateUrlErrorCount] error.stack:', error?.stack);
    }
  }

  private async removeUrlFromFile(urlToRemove: string): Promise<void> {
    console.log('[removeUrlFromFile] Iniciando remoção de URL');
    console.log('[removeUrlFromFile] urlToRemove:', urlToRemove);
    try {
      const urls = await this.readUrlsFromFile();
      console.log('[removeUrlFromFile] URLs antes da remoção:', urls);
      console.log('[removeUrlFromFile] Total de URLs antes:', urls.length);
      const filteredUrls = urls.filter((u) => u.url !== urlToRemove);
      console.log('[removeUrlFromFile] URLs após filtro:', filteredUrls);
      console.log(
        '[removeUrlFromFile] Total de URLs após:',
        filteredUrls.length,
      );
      await this.saveUrlsToFile(filteredUrls);
      console.log(
        `[removeUrlFromFile] URL removida após 3 erros: ${urlToRemove}`,
      );
    } catch (error) {
      console.error('[removeUrlFromFile] Error removing URL from file:', error);
      console.error('[removeUrlFromFile] error.message:', error?.message);
      console.error('[removeUrlFromFile] error.stack:', error?.stack);
    }
  }

  async addUrl(url: string): Promise<void> {
    console.log('[addUrl] Iniciando método');
    console.log('[addUrl] URL recebida:', url);
    console.log('[addUrl] Tipo da URL:', typeof url);
    try {
      console.log('[addUrl] Lendo URLs do arquivo...');
      const urls = await this.readUrlsFromFile();
      console.log('[addUrl] URLs atuais:', urls);
      console.log('[addUrl] Total de URLs antes:', urls.length);
      const urlExists = urls.some((u) => u.url === url);
      console.log('[addUrl] URL já existe?', urlExists);
      if (!urlExists) {
        console.log('[addUrl] URL não existe, adicionando...');
        urls.push({ url, errorCount: 0 });
        console.log('[addUrl] URL adicionada ao array local');
        console.log('[addUrl] Total de URLs após adicionar:', urls.length);
        await this.saveUrlsToFile(urls);
        console.log(`[addUrl] URL adicionada com sucesso: ${url}`);
      } else {
        console.log(`[addUrl] URL já existe, não foi adicionada: ${url}`);
      }
      console.log('[addUrl] Método finalizado com sucesso');
    } catch (error) {
      console.error('[addUrl] Error adding URL:', error);
      console.error('[addUrl] error.message:', error?.message);
      console.error('[addUrl] error.code:', error?.code);
      console.error('[addUrl] error.stack:', error?.stack);
      throw error;
    }
  }

  async getUrls(): Promise<UrlData[]> {
    console.log('[getUrls] Iniciando método');
    console.log('[getUrls] Lendo URLs do arquivo...');
    const urls = await this.readUrlsFromFile();
    console.log('[getUrls] URLs lidas:', urls);
    console.log('[getUrls] Total de URLs:', urls.length);
    console.log('[getUrls] Retornando URLs');
    return urls;
  }

  async getInscricoesData(cpf: string, uf: string): Promise<any> {
    console.log('[getInscricoesData] Iniciando método');
    console.log('[getInscricoesData] Parâmetros recebidos:', { cpf, uf });
    console.log('[getInscricoesData] timeout:', this.timeout);
    console.log('[getInscricoesData] retryAttempts:', this.retryAttempts);
    console.log('[getInscricoesData] urlsFilePath:', this.urlsFilePath);

    const urlsData = await this.readUrlsFromFile();
    console.log('[getInscricoesData] URLs lidas do arquivo:', urlsData);
    console.log('[getInscricoesData] Total de URLs:', urlsData.length);

    if (urlsData.length === 0) {
      console.error(
        '[getInscricoesData] SINTEGRA Total: Nenhuma URL disponível',
      );
      return 'error';
    }

    // Tenta cada URL disponível
    console.log('[getInscricoesData] Iniciando loop de URLs');
    for (const urlData of urlsData) {
      const { url } = urlData;
      let errorCount = urlData.errorCount; // Variável local que será atualizada
      console.log('[getInscricoesData] Processando urlData:', urlData);
      console.log('[getInscricoesData] URL atual:', url);
      console.log('[getInscricoesData] errorCount inicial:', errorCount);

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        console.log(
          `[getInscricoesData] SINTEGRA Total Attempt ${attempt}/${this.retryAttempts}: ${url}`,
        );
        console.log('[getInscricoesData] Preparando requisição POST');
        console.log('[getInscricoesData] Body da requisição:', { cpf, uf });
        console.log('[getInscricoesData] Headers:', {
          'Content-Type': 'application/json',
          'User-Agent': 'Report/1.0',
        });

        try {
          console.log('[getInscricoesData] Enviando requisição...');
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

          console.log('[getInscricoesData] Resposta recebida');
          console.log('[getInscricoesData] response:', response);
          console.log('[getInscricoesData] response.status:', response?.status);
          console.log(
            '[getInscricoesData] response.statusText:',
            response?.statusText,
          );
          console.log('[getInscricoesData] response.data:', response?.data);
          console.log(
            '[getInscricoesData] response.headers:',
            response?.headers,
          );

          // Validação da resposta
          if (!response || !response.data) {
            console.error(
              `[getInscricoesData] SINTEGRA Total Attempt ${attempt}: Resposta vazia ou inválida`,
            );
            console.log('[getInscricoesData] response é null?', !response);
            console.log(
              '[getInscricoesData] response.data é null?',
              !response?.data,
            );
            errorCount++;
            console.log(
              '[getInscricoesData] errorCount incrementado para:',
              errorCount,
            );
            await this.updateUrlErrorCount(url, errorCount);
            console.log('[getInscricoesData] errorCount atualizado no arquivo');

            if (errorCount >= this.retryAttempts) {
              console.log(
                `[getInscricoesData] errorCount (${errorCount}) >= retryAttempts (${this.retryAttempts}), removendo URL`,
              );
              await this.removeUrlFromFile(url);
              console.log(
                '[getInscricoesData] URL removida, saindo do loop de tentativas',
              );
              break; // Remove e tenta próxima URL
            }

            if (attempt === this.retryAttempts) {
              console.log(
                `[getInscricoesData] Última tentativa (${attempt}), saindo do loop de tentativas`,
              );
              break; // Tenta próxima URL
            }
            console.log(
              '[getInscricoesData] Continuando para próxima tentativa',
            );
            continue;
          }

          // Sucesso: zera o contador de erros
          if (errorCount > 0) {
            console.log(
              '[getInscricoesData] Zerando errorCount (era:',
              errorCount,
              ')',
            );
            errorCount = 0;
            await this.updateUrlErrorCount(url, 0);
            console.log('[getInscricoesData] errorCount zerado no arquivo');
          }

          console.log(
            `[getInscricoesData] SINTEGRA Total Success on attempt ${attempt}`,
          );
          console.log(
            '[getInscricoesData] Retornando response.data:',
            response.data,
          );
          return response.data;
        } catch (error) {
          console.log('[getInscricoesData] Erro capturado no catch');
          console.log('[getInscricoesData] error:', error);
          console.log('[getInscricoesData] error.message:', error?.message);
          console.log('[getInscricoesData] error.code:', error?.code);
          console.log('[getInscricoesData] error.response:', error?.response);
          console.log(
            '[getInscricoesData] error.response?.status:',
            error?.response?.status,
          );
          console.log(
            '[getInscricoesData] error.response?.data:',
            error?.response?.data,
          );
          console.log('[getInscricoesData] error.cause:', error?.cause);
          console.log(
            '[getInscricoesData] error.cause?.code:',
            error?.cause?.code,
          );
          console.log('[getInscricoesData] error.stack:', error?.stack);

          errorCount++;
          console.log(
            '[getInscricoesData] errorCount incrementado para:',
            errorCount,
          );
          await this.updateUrlErrorCount(url, errorCount);
          console.log('[getInscricoesData] errorCount atualizado no arquivo');

          console.error(
            `[getInscricoesData] SINTEGRA Total Attempt ${attempt} failed:`,
            {
              message: error?.message,
              code: error?.code,
              cause: error?.cause?.code,
            },
          );

          if (errorCount >= this.retryAttempts) {
            console.log(
              `[getInscricoesData] errorCount (${errorCount}) >= retryAttempts (${this.retryAttempts}), removendo URL`,
            );
            await this.removeUrlFromFile(url);
            console.log(
              '[getInscricoesData] URL removida, saindo do loop de tentativas',
            );
            break; // Remove e tenta próxima URL
          }

          if (attempt === this.retryAttempts) {
            console.log(
              `[getInscricoesData] Última tentativa (${attempt}), saindo do loop de tentativas`,
            );
            break; // Tenta próxima URL se houver
          }
          console.log('[getInscricoesData] Continuando para próxima tentativa');
        }
      }
      console.log(
        '[getInscricoesData] Finalizado loop de tentativas para URL:',
        url,
      );
    }

    // Se chegou aqui, todas as URLs falharam
    console.error('[getInscricoesData] SINTEGRA Total: Todas as URLs falharam');
    console.log('[getInscricoesData] Retornando "error"');
    return 'error';
  }
}
