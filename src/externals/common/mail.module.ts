import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { AlertEmailService } from './alert-email.service';

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_SMTP_HOST || 'smtp.zoho.com',
        port: Number(process.env.EMAIL_SMTP_PORT || 465),
        secure: process.env.EMAIL_SMTP_SECURE !== 'false',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      },
      defaults: {
        from: process.env.EMAIL_USER,
      },
    }),
  ],
  providers: [AlertEmailService],
  exports: [AlertEmailService],
})
export class MailModule {}
