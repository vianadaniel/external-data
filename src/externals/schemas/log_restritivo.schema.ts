import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogRestritivoDocument = LogRestritivo & Document;

export enum LogRestritivoLevel {
  INFO = 'info',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
}

export type LogRestritivoCredential = 'primary' | 'backup' | 'none';

export type LogRestritivoEvent =
  | 'consulta_start'
  | 'call_start'
  | 'call_success'
  | 'call_error'
  | 'empty_response'
  | 'fallback_skipped'
  | 'fallback_attempt'
  | 'fallback_unavailable'
  | 'consulta_success'
  | 'consulta_error';

@Schema({ timestamps: true, collection: 'log_restritivo' })
export class LogRestritivo {
  @Prop({ required: true, enum: LogRestritivoLevel, default: LogRestritivoLevel.INFO })
  level: LogRestritivoLevel;

  @Prop({ required: true, default: 'SPC' })
  provider: string;

  @Prop({ required: true })
  event: LogRestritivoEvent;

  @Prop({ required: true })
  message: string;

  @Prop({ required: false })
  documentoConsumidor?: string;

  @Prop({ required: false })
  tipoConsumidor?: string;

  @Prop({ required: false })
  codigoProduto?: string;

  @Prop({ required: false })
  credential?: LogRestritivoCredential;

  @Prop({ required: false })
  username?: string;

  @Prop({ required: false })
  httpStatus?: number;

  @Prop({ required: false })
  codigoRetorno?: string;

  @Prop({ required: false })
  reason?: string;

  /** Tempo gasto em milissegundos. */
  @Prop({ required: false })
  durationMs?: number;

  /** Tempo gasto em segundos (durationMs / 1000). */
  @Prop({ required: false })
  durationSec?: number;

  @Prop({ type: Object, required: false })
  request?: Record<string, any>;

  @Prop({ type: Object, required: false })
  response?: Record<string, any>;

  @Prop({ type: Object, required: false })
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  @Prop({ type: Object, required: false })
  meta?: Record<string, any>;
}

export const LogRestritivoSchema = SchemaFactory.createForClass(LogRestritivo);

LogRestritivoSchema.index({ createdAt: -1 });
LogRestritivoSchema.index({ event: 1, createdAt: -1 });
LogRestritivoSchema.index({ level: 1, createdAt: -1 });
LogRestritivoSchema.index({ documentoConsumidor: 1, createdAt: -1 });
LogRestritivoSchema.index({ codigoRetorno: 1, createdAt: -1 });
LogRestritivoSchema.index({ credential: 1, createdAt: -1 });
