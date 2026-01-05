import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { configDotenv } from 'dotenv';
import { lastValueFrom } from 'rxjs';
import { parseStringPromise } from 'xml2js';

configDotenv.apply(process.env);

@Injectable()
export class BoaVistaService {
  constructor(private readonly httpService: HttpService) {}

  async getExternalData(fiscal_number: string): Promise<any> {
    let body: string;
    let url: string;

    if (fiscal_number.length === 14) {
      body = `<?xml version="1.0" encoding="UTF-8"?>
<defineRiscoContratoEntradaXml
 xmlns="http://boavistaservicos.com.br/define/entrada/risco">
<usuario>${process.env.BV_USER}</usuario>
<senha>${process.env.BV_KEY}</senha>
<cnpj>${fiscal_number}</cnpj>
</defineRiscoContratoEntradaXml>`;
      url = 'https://define.bvsnet.com.br/DefineXml/servicos/defineRisco/v5';
    } else if (fiscal_number.length === 11) {
      body = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<acertaContratoEntrada
 xmlns="http://boavistaservicos.com.br/familia/acerta/pf">
<usuario>${process.env.BV_USER}</usuario>
<senha>${process.env.BV_KEY}</senha>
<cpf>${fiscal_number}</cpf>
<tipoCredito>CC</tipoCredito>
<consultaChequeSimples>S</consultaChequeSimples>
</acertaContratoEntrada>`;
      url = 'https://acerta.bvsnet.com.br/FamiliaAcertaPFXmlWeb/essencial/v3';
    } else {
      console.warn('Número fiscal inválido');
      return 'error';
    }

    const options = {
      explicitArray: true,
      ignoreAttrs: true,
      mergeAttrs: false,
      tagNameProcessors: [
        function (name) {
          return name.split(':').pop();
        },
      ],
    };

    try {
      const response: AxiosResponse = await lastValueFrom(
        this.httpService.post(url, body, {
          headers: { 'Content-Type': 'application/xml' },
        }),
      );

      return await parseStringPromise(response.data, options);
    } catch (error) {
      console.log(error);
    }
  }
}
