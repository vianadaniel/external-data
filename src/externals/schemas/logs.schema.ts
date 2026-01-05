import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogDocument = Log & Document;

export enum LogLevel {
  INFO = 'info',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
}

@Schema({ timestamps: true })
export class Log {
  @Prop({ required: true, enum: LogLevel, default: LogLevel.INFO })
  level: LogLevel;

  @Prop({ required: true })
  service: string;

  @Prop({ required: false })
  endpoint?: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object, required: false })
  data?: any;

  @Prop({ type: Object, required: false })
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };

  @Prop({ type: Object, required: false })
  request?: {
    method?: string;
    url?: string;
    body?: any;
    params?: any;
    query?: any;
  };

  @Prop({ type: Object, required: false })
  response?: {
    statusCode?: number;
  };

  @Prop({ required: false })
  duration?: number; // em segundos

  @Prop({ required: false })
  userId?: string;

  @Prop({ required: false })
  clientId?: string;

  @Prop({ required: false, default: '' })
  company_id?: string;

  @Prop({ required: false, default: '' })
  user_id?: string;

  @Prop({ required: false })
  node_env?: string;
}

export const LogSchema = SchemaFactory.createForClass(Log);

// Índices para melhorar performance de consultas
LogSchema.index({ createdAt: -1 });
LogSchema.index({ service: 1, createdAt: -1 });
LogSchema.index({ level: 1, createdAt: -1 });
LogSchema.index({ endpoint: 1, createdAt: -1 });
LogSchema.index({ company_id: 1, createdAt: -1 });
LogSchema.index({ user_id: 1, createdAt: -1 });
LogSchema.index({ node_env: 1, createdAt: -1 });
