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

    // Determinar node_env baseado no IP da requisição
    const node_env = this.determineNodeEnv(request);

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

  private determineNodeEnv(request: Request): string {
    // Obter o IP da requisição
    // Pode vir de x-forwarded-for (quando há proxy), x-real-ip, ou connection.remoteAddress
    const forwardedFor = request.headers['x-forwarded-for'];
    const realIp = request.headers['x-real-ip'];
    const remoteAddress =
      request.connection?.remoteAddress || request.socket?.remoteAddress;

    // Logs para debug
    console.log('[determineNodeEnv] x-forwarded-for:', forwardedFor);
    console.log('[determineNodeEnv] x-real-ip:', realIp);
    console.log(
      '[determineNodeEnv] connection.remoteAddress:',
      request.connection?.remoteAddress,
    );
    console.log(
      '[determineNodeEnv] socket.remoteAddress:',
      request.socket?.remoteAddress,
    );
    console.log('[determineNodeEnv] remoteAddress (final):', remoteAddress);
    console.log('[determineNodeEnv] request.ip:', request.ip);
    console.log(
      '[determineNodeEnv] request.headers:',
      JSON.stringify(request.headers, null, 2),
    );
    console.log('[determineNodeEnv] request.connection:', {
      remoteAddress: request.connection?.remoteAddress,
      remotePort: request.connection?.remotePort,
    });
    console.log('[determineNodeEnv] request.socket:', {
      remoteAddress: request.socket?.remoteAddress,
      remotePort: request.socket?.remotePort,
    });

    // x-forwarded-for pode conter múltiplos IPs separados por vírgula (o primeiro é o IP original)
    const ip = forwardedFor
      ? Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0].trim()
      : realIp || remoteAddress;

    console.log('[determineNodeEnv] IP final calculado:', ip);
    console.log(
      '[determineNodeEnv] IP === 98.86.185.72?',
      ip === '98.86.185.72',
    );

    // Verificar se o IP é 98.86.185.72 (produção)
    if (ip === '98.86.185.72') {
      console.log('[determineNodeEnv] Retornando: prod');
      return 'prod';
    }

    // Para todos os outros casos, retornar 'dev'
    console.log('[determineNodeEnv] Retornando: dev');
    return 'dev';
  }
}
