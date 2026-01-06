import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument, LogLevel } from './schemas/logs.schema';

@Injectable()
export class LogsService {
  constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

  async createLog(
    level: LogLevel,
    service: string,
    message: string,
    options?: {
      endpoint?: string;
      data?: any;
      error?: Error | any;
      request?: any;
      response?: any;
      duration?: number;
      userId?: string;
      clientId?: string;
      company_id?: string;
      user_id?: string;
      node_env?: string;
    },
  ): Promise<LogDocument> {
    const logData: any = {
      level,
      service,
      message,
      company_id: options?.company_id || '',
      user_id: options?.user_id || '',
      node_env: options?.node_env || '',
    };

    if (options) {
      if (options.endpoint) logData.endpoint = options.endpoint;
      if (options.data) logData.data = options.data;
      if (options.request) logData.request = options.request;
      if (options.response) logData.response = options.response;
      if (options.duration !== undefined) logData.duration = options.duration;
      if (options.userId) logData.userId = options.userId;
      if (options.clientId) logData.clientId = options.clientId;

      if (options.error) {
        logData.error = {
          message: options.error.message || String(options.error),
          stack: options.error.stack,
          code: options.error.code,
        };
      }
    }

    const log = new this.logModel(logData);
    return (await log.save()) as any;
  }

  async info(
    service: string,
    message: string,
    options?: {
      endpoint?: string;
      data?: any;
      request?: any;
      response?: any;
      duration?: number;
      userId?: string;
      clientId?: string;
      company_id?: string;
      user_id?: string;
      node_env?: string;
    },
  ): Promise<LogDocument> {
    return this.createLog(LogLevel.INFO, service, message, options);
  }

  async error(
    service: string,
    message: string,
    error?: Error | any,
    options?: {
      endpoint?: string;
      data?: any;
      request?: any;
      response?: any;
      duration?: number;
      userId?: string;
      clientId?: string;
      company_id?: string;
      user_id?: string;
      node_env?: string;
    },
  ): Promise<LogDocument> {
    return this.createLog(LogLevel.ERROR, service, message, {
      ...options,
      error,
    });
  }

  async warn(
    service: string,
    message: string,
    options?: {
      endpoint?: string;
      data?: any;
      request?: any;
      response?: any;
      duration?: number;
      userId?: string;
      clientId?: string;
      company_id?: string;
      user_id?: string;
      node_env?: string;
    },
  ): Promise<LogDocument> {
    return this.createLog(LogLevel.WARN, service, message, options);
  }

  async debug(
    service: string,
    message: string,
    options?: {
      endpoint?: string;
      data?: any;
      request?: any;
      response?: any;
      duration?: number;
      userId?: string;
      clientId?: string;
      company_id?: string;
      user_id?: string;
      node_env?: string;
    },
  ): Promise<LogDocument> {
    return this.createLog(LogLevel.DEBUG, service, message, options);
  }

  async findAll(
    filters?: {
      service?: string;
      level?: LogLevel;
      endpoint?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100,
    skip: number = 0,
  ): Promise<LogDocument[]> {
    const query: any = {};

    if (filters) {
      if (filters.service) query.service = filters.service;
      if (filters.level) query.level = filters.level;
      if (filters.endpoint) query.endpoint = filters.endpoint;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }
    }

    const logs = await this.logModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
    return logs as unknown as LogDocument[];
  }

  async count(filters?: {
    service?: string;
    level?: LogLevel;
    endpoint?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number> {
    const query: any = {};

    if (filters) {
      if (filters.service) query.service = filters.service;
      if (filters.level) query.level = filters.level;
      if (filters.endpoint) query.endpoint = filters.endpoint;
      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }
    }

    return this.logModel.countDocuments(query).exec();
  }
}
