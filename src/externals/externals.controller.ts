import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { Request } from 'express';
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
import { LoggingInterceptor } from './logging.interceptor';

@Controller('externals')
@UseInterceptors(LoggingInterceptor)
export class ExternalsController {
  constructor(
    private readonly bigDataService: BigDataService,
    private readonly directDataService: DirectDataService,
    private readonly windService: WindService,
    private readonly escavadorDataService: EscavadorDataService,
    private readonly infoSimplesDataService: InfoSimplesDataService,
    private readonly boaVistaService: BoaVistaService,
    private readonly rrService: RRService,

    private readonly checkProService: CheckProService,
    private readonly bndesService: BndesService,
    private readonly spcService: SPCService,
    private readonly farmScraperService: FarmScraperService,
    private readonly sintegraTotalDataService: SintegraTotalDataService,
    private readonly reportUtilsDataService: ReportUtilsDataService,
    private readonly claudeService: ClaudeService,
    private readonly openAIService: OpenAIService,
    private readonly chatPDFExtractor: ChatPDFExtractor,
  ) {}

  // ========== BigData ==========

  @Post('bigdata/data')
  async getBigDataData(
    @Body()
    body: {
      identifier: string;
      fiscal_id_number: string;
      data_set: string;
      car_number?: string;
      uf?: string;
    },
  ): Promise<any> {
    return this.bigDataService.getExternalDataBigData(
      body.identifier,
      body.fiscal_id_number,
      body.data_set,
      body.car_number,
      body.uf,
    );
  }

  // ========== DirectData ==========
  @Post('directd')
  async getDirectdData(@Body() body: { identifier: string }): Promise<any> {
    return this.directDataService.getDirectdData(body.identifier);
  }

  // ========== Wind ==========
  @Post('wind/search-by-phone')
  async searchByPhone(@Body() body: { phone: string }): Promise<any> {
    return this.windService.getExternalSearchClientsByPhone(body.phone);
  }

  @Post('wind/search-by-name')
  async searchByName(@Body() body: { name: string; uf: string }): Promise<any> {
    return this.windService.getExternalSearchClientsByName(body.name, body.uf);
  }

  @Post('wind/vehicle-total')
  async getVehicleTotal(@Body() body: { plate: string }): Promise<any> {
    return this.windService.getExternalVehicleTotal(body.plate);
  }

  @Post('wind/vehicle-essential')
  async getVehicleEssential(@Body() body: { plate: string }): Promise<any> {
    return this.windService.getExternalVehicleEssential(body.plate);
  }

  @Post('wind/restritivo-simples')
  async getRestritivoSimples(
    @Body() body: { cpfcnpj: string; uf?: string },
  ): Promise<any> {
    return this.windService.getExternalRestritivoSimplesData(
      body.cpfcnpj,
      body.uf,
    );
  }

  @Post('wind/restritivo')
  async getRestritivo(@Body() body: { cpfcnpj: string }): Promise<any> {
    return this.windService.getExternalRestritivoData(body.cpfcnpj);
  }

  @Post('wind/search-cars')
  async searchCars(@Body() body: { cpfcnpj: string }): Promise<any> {
    return this.windService.getExternalSearchCars(body.cpfcnpj);
  }

  @Post('wind/bvs')
  async getBVS(@Body() body: { cpfcnpj: string; uf?: string }): Promise<any> {
    return this.windService.getExternalBVSData(body.cpfcnpj, body.uf);
  }

  @Post('wind/scr')
  async getSCR(@Body() body: { cpfcnpj: string }): Promise<any> {
    return this.windService.getExternalSCRData(body.cpfcnpj);
  }

  // ========== Escavador ==========
  @Get('escavador/:identifier')
  async getEscavadorData(
    @Param('identifier') identifier: string,
  ): Promise<any> {
    return this.escavadorDataService.getExternalData(identifier);
  }

  @Post('escavador/:identifier')
  async getEscavadorDataPost(
    @Param('identifier') identifier: string,
  ): Promise<any> {
    return this.escavadorDataService.getExternalDataPost(identifier);
  }

  // ========== InfoSimples ==========
  @Post('infosimples/*')
  async getInfoSimplesData(
    @Req() request: Request,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() _body: any, // body é usado apenas pelo interceptor para logging
  ): Promise<any> {
    // Extrair o identifier completo incluindo query parameters
    // A URL será algo como: /externals/infosimples/receita-federal/cpf?cpf=34285231808&birthdate=1984-12-04
    // Remover /externals/infosimples/ do início da URL
    const urlPath = request.url.replace('/externals/infosimples', '');
    // Se começar com /, remover
    const identifier = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
    // console.log('[InfoSimples Controller] Full URL:', request.url);
    // console.log('[InfoSimples Controller] Identifier received:', identifier);
    return this.infoSimplesDataService.getExternalData(identifier);
  }

  // ========== BoaVista ==========
  @Post('boavista')
  async getBoaVistaData(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.boaVistaService.getExternalData(body.fiscal_number);
  }

  // ========== RR (Registro Rural) ==========
  @Post('rr/incra')
  async getRRIncra(@Body() body: { cpfcnpj: string }): Promise<any> {
    return this.rrService.getExternalDataIncra(body.cpfcnpj);
  }

  @Post('rr/car')
  async getRRCar(@Body() body: { cpfcnpj: string }): Promise<any> {
    return this.rrService.getExternalDataCar(body.cpfcnpj);
  }

  // ========== CheckPro ==========
  @Post('checkpro/gravame')
  async getGravame(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getGravameData(body.placa, body.chassi);
  }

  @Post('checkpro/bin-nacional')
  async getBinNacional(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getBinNacionalData(body.placa, body.chassi);
  }

  @Post('checkpro/bin-estadual')
  async getBinEstadual(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getBinEstadualData(body.placa, body.chassi);
  }

  @Post('checkpro/address')
  async getAddress(@Body() body: { cpf_cnpj: string }): Promise<any> {
    return this.checkProService.getAddressData(body.cpf_cnpj);
  }

  @Post('checkpro/price')
  async getPrice(@Body() body: { placa: string }): Promise<any> {
    return this.checkProService.getPriceData(body.placa);
  }

  @Post('checkpro/leilao')
  async getLeilao(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getLeilaoData(body.placa, body.chassi);
  }

  @Post('checkpro/leilao-simples')
  async getLeilaoSimples(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getLeilaoSimplesData(body.placa, body.chassi);
  }

  @Post('checkpro/sinistro')
  async getSinistro(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getSinistroData(body.placa, body.chassi);
  }

  @Post('checkpro/renainf')
  async getRenainf(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getRenainfData(body.placa, body.chassi);
  }

  @Post('checkpro/historico-proprietarios')
  async getHistoricoProprietarios(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getHistoricoProprietariosData(
      body.placa,
      body.chassi,
    );
  }

  @Post('checkpro/remarketing')
  async getRemarketing(
    @Body() body: { placa?: string; chassi?: string },
  ): Promise<any> {
    return this.checkProService.getRemarketingData(body.placa, body.chassi);
  }

  // ========== BNDES ==========
  @Post('bndes')
  async getBndesData(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.bndesService.getExternalData(body.fiscal_number);
  }

  // ========== SPC ==========
  @Post('spc/consulta-producao')
  async consultaSPCProducao(@Body() body: any): Promise<any> {
    return this.spcService.consultaProducao(body);
  }

  @Post('spc/pessoa-juridica')
  async consultaSPCPessoaJuridica(
    @Body()
    body: {
      cnpj: string;
      codigoProduto?: string;
      insumos?: number[];
    },
  ): Promise<any> {
    return this.spcService.consultaPessoaJuridica(
      body.cnpj,
      body.codigoProduto,
      body.insumos,
    );
  }

  @Post('spc/pessoa-fisica')
  async consultaSPCPessoaFisica(
    @Body()
    body: {
      cpf: string;
      codigoProduto?: string;
      insumos?: number[];
    },
  ): Promise<any> {
    return this.spcService.consultaPessoaFisica(
      body.cpf,
      body.codigoProduto,
      body.insumos,
    );
  }

  // ========== FarmScraper ==========

  @Post('farm-scraper/ccir/emitir')
  async getCcirEmission(
    @Body()
    body: {
      sncr: string;
      estado: string;
      cidade: string;
      fiscal_number: string;
    },
  ): Promise<any> {
    return this.farmScraperService.getCcirEmission(
      body.sncr,
      body.estado,
      body.cidade,
      body.fiscal_number,
    );
  }

  @Post('farm-scraper/sintegra/goias')
  async getSintegraGoias(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.farmScraperService.getSintegraGoias(body.fiscal_number);
  }

  @Post('farm-scraper/sintegra/bahia')
  async getSintegraBahia(
    @Body()
    body: {
      fiscal_number: string;
      company_id?: string;
      user_id?: string;
    },
  ): Promise<any> {
    return this.farmScraperService.getSintegraBahia(body.fiscal_number);
  }

  @Post('farm-scraper/sintegra/para')
  async getSintegraPara(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getSintegraPara(body.fiscal_number);
  }

  @Post('farm-scraper/sintegra/parana')
  async getSintegraParana(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.farmScraperService.getSintegraParana(body.fiscal_number);
  }

  @Post('farm-scraper/pgesp/consulta')
  async getPgespConsulta(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.farmScraperService.getPgespConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjsp/consulta')
  async getTjspConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjspEsaj(body.fiscal_number);
  }

  @Post('farm-scraper/tjms/consulta')
  async getTjmsConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjmsConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjdft/consulta')
  async getTjdftConsulta(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.farmScraperService.getTjdftConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjgo/consulta')
  async getTjgoConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjgoConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjpr/consulta')
  async getTjprConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjprProjudi(body.fiscal_number);
  }

  @Post('farm-scraper/trt2/consulta')
  async getTrt2Consulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTrt2Consulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjsc/consulta')
  async getTjscConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjscConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjmg/consulta')
  async getTjmgConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjmgConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjma/consulta')
  async getTjmaPje(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjmaPje(body.fiscal_number);
  }

  @Post('farm-scraper/tjpa/consulta')
  async getTjpaConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjpaConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjce/consulta')
  async getTjceConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjceConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjap/consulta')
  async getTjapConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjapConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjse/consulta')
  async getTjseConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjseConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjba/consulta')
  async getTjbaConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjbaConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjrj/consulta')
  async getTjrjConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjrjConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tst/cndt/emitir')
  async getTstCndtEmitir(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.farmScraperService.getTstCndtEmitir(body.fiscal_number);
  }

  @Post('farm-scraper/tjac/consulta')
  async getTjacConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjacConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjam/consulta')
  async getTjamConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjamConsulta(body.fiscal_number);
  }

  @Post('farm-scraper/tjro/consulta')
  async getTjroConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.farmScraperService.getTjroConsulta(body.fiscal_number);
  }

  @Get('farm-scraper/*')
  async getFarmScraperData(@Param('0') identifier: string): Promise<any> {
    return this.farmScraperService.getExternalDataGet(identifier);
  }

  @Post('farm-scraper/*')
  async postFarmScraperData(
    @Param('0') identifier: string,
    @Body() body: { fiscal_number: string; birthdate?: string },
  ): Promise<any> {
    return this.farmScraperService.getExternalDataPost(
      identifier,
      body.fiscal_number,
      body.birthdate,
    );
  }

  // ========== SintegraTotal ==========
  @Post('sintegra-total/inscricoes')
  async getInscricoesData(
    @Body() body: { cpf: string; uf: string },
  ): Promise<any> {
    return this.sintegraTotalDataService.getInscricoesData(body.cpf, body.uf);
  }

  // ========== ReportUtils ==========
  @Post('report-utils/mpsp/civel')
  async getMpspCertidaoCivel(
    @Body() body: { fiscal_number: string; name: string },
  ): Promise<any> {
    return this.reportUtilsDataService.getMpspCertidaoCivel(
      body.fiscal_number,
      body.name,
    );
  }

  @Post('report-utils/mpsp/criminal')
  async getMpspCertidaoCriminal(
    @Body()
    body: {
      fiscal_number: string;
      name: string;
      birth_date?: string;
      mother_name?: string;
    },
  ): Promise<any> {
    return this.reportUtilsDataService.getMpspCertidaoCriminal(
      body.fiscal_number,
      body.name,
      body.birth_date,
      body.mother_name,
    );
  }

  @Post('report-utils/lawsuits/consulta')
  async getEscavadorConsulta(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.reportUtilsDataService.getEscavadorConsulta(body.fiscal_number);
  }

  @Post('report-utils/tjmt/consulta')
  async getTjmtConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.reportUtilsDataService.getTjmtConsulta(body.fiscal_number);
  }

  @Post('report-utils/tjrs/consulta')
  async getTjrsConsulta(
    @Body() body: { fiscal_number: string; name: string },
  ): Promise<any> {
    return this.reportUtilsDataService.getTjrsConsulta(
      body.fiscal_number,
      body.name,
    );
  }

  @Post('report-utils/tjpb/consulta')
  async getTjpbConsulta(@Body() body: { fiscal_number: string }): Promise<any> {
    return this.reportUtilsDataService.getTjpbConsulta(body.fiscal_number);
  }

  // ========== Claude ==========
  @Post('claude/completion-lawsuits')
  async getClaudeCompletionLawsuits(
    @Body() body: { prompt: any },
  ): Promise<string> {
    return this.claudeService.getCompletionLawsuits(body.prompt);
  }

  // ========== OpenAI ==========
  @Post('openai/completion-lawsuits')
  async getOpenAICompletionLawsuits(
    @Body() body: { prompt: any },
  ): Promise<string | undefined> {
    return this.openAIService.getCompletionLawsuits(body.prompt);
  }

  @Post('openai/completion')
  async getOpenAICompletion(
    @Body() body: { query: any },
  ): Promise<string | undefined> {
    return this.openAIService.getCompletionOpenIA(body.query);
  }

  // ========== ChatPDF ==========
  @Post('chatpdf/extract')
  async extractChatPDF(
    @Body() body: { sourceId: string; query: string },
  ): Promise<string> {
    return this.chatPDFExtractor.extract(body.sourceId, body.query);
  }

  // ========== Sintegra URLs ==========
  @Post('sintegra/url')
  async addSintegraUrl(
    @Body() body: { url: string },
  ): Promise<{ message: string }> {
    await this.sintegraTotalDataService.addUrl(body.url);
    return { message: 'URL adicionada com sucesso' };
  }

  @Get('sintegra/url')
  async getSintegraUrls(): Promise<{
    urls: Array<{ url: string; errorCount: number }>;
  }> {
    const urls = await this.sintegraTotalDataService.getUrls();
    return { urls };
  }
}
