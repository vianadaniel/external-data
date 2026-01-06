import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { LogsService } from './logs.service';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params, headers } = request;
    const endpoint = url;
    const startTime = Date.now();

    // Extrair company_id e user_id de body, query, params ou headers
    const company_id = this.extractValue(
      body,
      query,
      params,
      headers,
      'company_id',
    );
    const user_id = this.extractValue(body, query, params, headers, 'user_id');

    // Determinar node_env baseado na origem da requisição
    const node_env = this.determineNodeEnv(headers);

    const logData = {
      endpoint,
      company_id: company_id || '',
      user_id: user_id || '',
      node_env,
      request: {
        method,
        url,
        body: this.sanitizeBody(body),
        query,
        params,
      },
    };

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startTime;
        const duration = durationMs / 1000; // Converter para segundos
        // Log único com resultado de sucesso
        this.logsService
          .info('ExternalsController', `Request: ${method} ${endpoint}`, {
            ...logData,
            response: {
              statusCode: 200,
            },
            duration,
          })
          .catch((err) => console.error('Error logging:', err));
      }),
      catchError((error) => {
        const durationMs = Date.now() - startTime;
        const duration = durationMs / 1000; // Converter para segundos
        // Log único com resultado de erro
        this.logsService
          .error(
            'ExternalsController',
            `Request: ${method} ${endpoint}`,
            error,
            {
              ...logData,
              response: {
                statusCode: error.status || 500,
              },
              duration,
            },
          )
          .catch((err) => console.error('Error logging:', err));
        return throwError(() => error);
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    const sanitized = { ...body };
    // Remover campos sensíveis se necessário
    // if (sanitized.password) sanitized.password = '***';
    return sanitized;
  }

  private extractValue(
    body: any,
    query: any,
    params: any,
    headers: any,
    key: string,
  ): string | undefined {
    // Tenta encontrar o valor em body, query, params ou headers
    return (
      body?.[key] ||
      query?.[key] ||
      params?.[key] ||
      headers?.[key] ||
      headers?.[key.toLowerCase()] ||
      headers?.[`x-${key}`] ||
      headers?.[`x-${key.toLowerCase()}`]
    );
  }

  private determineNodeEnv(headers: any): string {
    // Verificar se a requisição vem de https://api.mfcheck.com.br/
    const origin = headers.origin || headers.referer || headers.host || '';
    const originLower = origin.toLowerCase();
    console.log(
      originLower,
      'headers',
      headers.origin,
      headers.referer,
      headers.host,
    );
    if (originLower.includes('api.mfcheck.com.br')) {
      return 'prod';
    }

    // Para todos os outros casos, retornar 'dev'
    return 'dev';
  }
}
