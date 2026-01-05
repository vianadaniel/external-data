import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { configDotenv } from 'dotenv';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { SentryModule } from '@sentry/nestjs/setup';
import { ExternalsModule } from './externals/externals.module';

configDotenv.apply(process.env);

@Module({
  imports: [
    SentryModule.forRoot(),
    MongooseModule.forRoot(
      `${process.env.MONGODB_HOST ?? 'localhost:27017'}/nest`,
    ),
    ExternalsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}
