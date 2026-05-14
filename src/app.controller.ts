import { Controller, Get, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { SintegraTotalDataService } from './externals/sintegra_total_data';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly sintegraTotalDataService: SintegraTotalDataService,
  ) {}

  @Get()
  test(): string {
    return this.appService.test();
  }

  @Post('escavador/consulta')
  async sintegraTotalEscavadorConsulta(
    @Body() body: { fiscal_number: string },
  ): Promise<any> {
    return this.sintegraTotalDataService.getEscavadorConsulta(
      body.fiscal_number,
    );
  }
}
