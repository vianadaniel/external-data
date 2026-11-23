import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LogRestritivo,
  LogRestritivoCredential,
  LogRestritivoDocument,
  LogRestritivoEvent,
  LogRestritivoLevel,
} from './schemas/log_restritivo.schema';

export interface CreateLogRestritivoInput {
  level?: LogRestritivoLevel;
  event: LogRestritivoEvent;
  message: string;
  documentoConsumidor?: string;
  tipoConsumidor?: string;
  codigoProduto?: string;
  credential?: LogRestritivoCredential;
  username?: string;
  httpStatus?: number;
  codigoRetorno?: string;
  reason?: string;
  durationMs?: number;
  durationSec?: number;
  request?: Record<string, any>;
  response?: Record<string, any>;
  error?: Error | any;
  meta?: Record<string, any>;
}

@Injectable()
export class LogRestritivoService {
  constructor(
    @InjectModel(LogRestritivo.name)
    private readonly logRestritivoModel: Model<LogRestritivoDocument>,
  ) {}

  async create(input: CreateLogRestritivoInput): Promise<LogRestritivoDocument> {
    const logData: Partial<LogRestritivo> = {
      level: input.level ?? LogRestritivoLevel.INFO,
      provider: 'SPC',
      event: input.event,
      message: input.message,
      documentoConsumidor: input.documentoConsumidor,
      tipoConsumidor: input.tipoConsumidor,
      codigoProduto: input.codigoProduto,
      credential: input.credential,
      username: input.username,
      httpStatus: input.httpStatus,
      codigoRetorno: input.codigoRetorno,
      reason: input.reason,
      durationMs: input.durationMs,
      durationSec:
        input.durationSec ??
        (input.durationMs != null
          ? Number((input.durationMs / 1000).toFixed(3))
          : undefined),
      request: input.request,
      response: input.response,
      meta: input.meta,
    };

    if (input.error) {
      logData.error = {
        message: input.error?.message || String(input.error),
        stack: input.error?.stack,
        code: input.error?.code,
      };
    }

    const log = new this.logRestritivoModel(logData);
    return (await log.save()) as LogRestritivoDocument;
  }

  /** Fire-and-forget: nunca quebra o fluxo da consulta SPC. */
  persist(input: CreateLogRestritivoInput): void {
    void this.create(input).catch((err) => {
      console.error('Erro ao gravar log_restritivo:', err?.message ?? err);
    });
  }

  async findAll(
    filters?: {
      level?: LogRestritivoLevel;
      event?: LogRestritivoEvent;
      documentoConsumidor?: string;
      codigoRetorno?: string;
      credential?: LogRestritivoCredential;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    skip: number = 0,
  ): Promise<LogRestritivoDocument[]> {
    const query: Record<string, any> = { provider: 'SPC' };

    if (filters) {
      if (filters.level) query.level = filters.level;
      if (filters.event) query.event = filters.event;
      if (filters.documentoConsumidor) {
        query.documentoConsumidor = filters.documentoConsumidor;
      }
      if (filters.codigoRetorno) query.codigoRetorno = filters.codigoRetorno;
      if (filters.credential) query.credential = filters.credential;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }
    }

    return (await this.logRestritivoModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec()) as unknown as LogRestritivoDocument[];
  }
}
