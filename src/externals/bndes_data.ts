import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse, AxiosError } from 'axios';
import { configDotenv } from 'dotenv';
import { lastValueFrom, timer } from 'rxjs';
import { retry, catchError, timeout } from 'rxjs/operators';

configDotenv.apply(process.env);

@Injectable()
export class BndesService {
  private readonly logger = new Logger(BndesService.name);
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000; // 1 second
  private readonly timeoutMs = 10000; // 10 seconds

  constructor(private readonly httpService: HttpService) {}

  async getExternalData(fiscal_number: string): Promise<any | null> {
    const url = `https://gateway.apis.bndes.gov.br/operacoes/web/select`;

    // Simplified parameters to avoid encoding issues
    const params = {
      q: fiscal_number,
      defType: 'edismax',
      qf: 'documentoClienteIndex',
      rows: '10000',
      omitHeader: 'true',
    };

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService
          .get(url, {
            params,
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
            timeout: this.timeoutMs,
          })
          .pipe(
            timeout(this.timeoutMs),
            retry({
              count: this.maxRetries,
              delay: (error, retryCount) => {
                this.logger.warn(
                  `Tentativa ${retryCount} falhou para CNPJ ${fiscal_number}. Tentando novamente em ${this.baseDelay * retryCount}ms...`,
                );
                return timer(this.baseDelay * retryCount);
              },
            }),
            catchError((error: AxiosError) => {
              this.handleApiError(error, fiscal_number);
              return [null]; // Return null instead of throwing
            }),
          ),
      );

      if (response && response.data) {
        this.logger.log(
          `Consulta BNDES bem-sucedida para CPF/CNPJ: ${fiscal_number}`,
        );
        return response.data;
      }

      return null;
    } catch (error) {
      this.handleApiError(error as AxiosError, fiscal_number);
      return null;
    }
  }

  private handleApiError(error: AxiosError, fiscal_number: string): void {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      this.logger.error(
        `Timeout na consulta BNDES para CPF/CNPJ ${fiscal_number}. API pode estar sobrecarregada.`,
      );
    } else if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;

      switch (status) {
        case 504:
          this.logger.error(
            `Gateway Timeout (504) na consulta BNDES para CPF/CNPJ ${fiscal_number}. Servidor BNDES indisponível.`,
          );
          break;
        case 503:
          this.logger.error(
            `Service Unavailable (503) na consulta BNDES para CPF/CNPJ ${fiscal_number}. Serviço temporariamente indisponível.`,
          );
          break;
        case 500:
          this.logger.error(
            `Internal Server Error (500) na consulta BNDES para CPF/CNPJ ${fiscal_number}. Erro interno do servidor BNDES.`,
          );
          break;
        case 429:
          this.logger.error(
            `Rate Limit (429) na consulta BNDES para CPF/CNPJ ${fiscal_number}. Muitas requisições.`,
          );
          break;
        default:
          this.logger.error(
            `Erro HTTP ${status} (${statusText}) na consulta BNDES para CPF/CNPJ ${fiscal_number}`,
          );
      }
    } else if (error.request) {
      this.logger.error(
        `Erro de rede na consulta BNDES para CPF/CNPJ ${fiscal_number}. Verifique sua conexão.`,
      );
    } else {
      this.logger.error(
        `Erro inesperado na consulta BNDES para CPF/CNPJ ${fiscal_number}: ${error.message}`,
      );
    }
  }
}
