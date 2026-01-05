import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getCompletionLawsuits(prompt: any): Promise<string | undefined> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Seja um analista jurídico, verifique a probabilidade da pessoa ser o réu = CLAIMED nesses casos, casos ele seja advogado = LAWYER marcar true na chave , verificar se o processo é de acao criminal, cível, ambiental, se a probabilidade for alta dele ser o réu isso pode impactar problemas financeiros e pode indicar mau pagador',
          },
          {
            role: 'user',
            content: `${JSON.stringify(prompt)} retorne somente um objeto json "nada além disso"  sem que ele apareça com a notação de blocos com a interface é {
    "total_processos": string,
    "acoes_criminais": boolean,
    "acoes_civeis": boolean,
    "acoes_ambientais": boolean,
    "acoes_que_pode_impactar_problemas_financeiros": boolean,
    "acoes_que_pode_indicar_mau_pagador": boolean,
    "isLaweyer": boolean,
    "probabilidade_de_ser_reu": string,
    "probabilidade_impactar_problemas_financeiros": string,
    "probabilidade_indicar_mau_pagador": string,
    "mensagem": string,
    }`,
          },
        ],
      });
      console.log(response.choices[0].message.content);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error fetching completion:', error);
      return undefined;
    }
  }

  async getCompletionOpenIA(query: any): Promise<string | undefined> {
    try {
      const queryContent =
        typeof query === 'object' ? JSON.stringify(query) : query;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Modelo mais econômico
        messages: [
          {
            role: 'system',
            content:
              'Analise os dados, realize o agrupamento e retorne o resultado em Markdown.',
          },
          {
            role: 'user',
            content: queryContent, // Use the stringified version if it was an object
          },
        ],
      });

      const completion = response.choices?.[0]?.message?.content;
      if (!completion) {
        console.warn('OpenAI retornou uma resposta vazia.');
        return undefined;
      }

      return completion;
    } catch (error) {
      console.error('Erro ao buscar a resposta da OpenAI:', error);
      return undefined;
    }
  }
}
