import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { ExternalsController } from './externals.controller';
import { BigDataService } from './big_data';
import { DirectDataService } from './direct_data';
import { WindService } from './wind_data';
import { EscavadorDataService } from './escavador_data';
import { InfoSimplesDataService } from './info_simples_data';
import { BoaVistaService } from './boa_vista_data';
import { RRService } from './rr_data';
import { CheckProService } from './checkpro';
import { BndesService } from './bndes_data';
import { SPCService } from './spc_data';
import { FarmScraperService } from './farm_scraper';
import { SintegraTotalDataService } from './sintegra_total_data';
import { ReportUtilsDataService } from './report_utils_data';
import { ClaudeService } from './chat_claude';
import { OpenAIService } from './chat_ia';
import { ChatPDFExtractor } from './chatpdf';
import { LogsService } from './logs.service';
import { Log, LogSchema } from './schemas/logs.schema';
import { LoggingInterceptor } from './logging.interceptor';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([{ name: Log.name, schema: LogSchema }]),
  ],
  controllers: [ExternalsController],
  providers: [
    LogsService,
    LoggingInterceptor,
    BigDataService,
    DirectDataService,
    WindService,
    EscavadorDataService,
    InfoSimplesDataService,
    BoaVistaService,
    RRService,
    CheckProService,
    BndesService,
    SPCService,
    FarmScraperService,
    SintegraTotalDataService,
    ReportUtilsDataService,
    ClaudeService,
    OpenAIService,
    ChatPDFExtractor,
  ],
  exports: [
    LogsService,
    BigDataService,
    DirectDataService,
    WindService,
    EscavadorDataService,
    InfoSimplesDataService,
    BoaVistaService,
    RRService,
    CheckProService,
    BndesService,
    SPCService,
    FarmScraperService,
    SintegraTotalDataService,
    ReportUtilsDataService,
    ClaudeService,
    OpenAIService,
    ChatPDFExtractor,
  ],
})
export class ExternalsModule {}
