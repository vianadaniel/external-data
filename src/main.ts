import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configDotenv } from 'dotenv';
import './instrument';

configDotenv.apply(process.env);

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT);
  console.log(`Report Server is running on port ${process.env.PORT}`);
}
bootstrap();
