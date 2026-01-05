import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ClaudeService {
  private readonly apiKey = process.env.ANTHROPIC_API_KEY;
  private readonly apiUrl = 'https://api.anthropic.com/v1/messages';
  private readonly maxRetries = 3;
  private readonly initialRetryDelay = 1000;

  private readonly systemPrompt = `
Você é um analista jurídico. Analise os dados e retorne apenas um JSON.

Regras de análise:
- A soma de total_processos é a soma da Distribuição por Tipo de Parte.
- Verificar tipo de ação: cível, criminal, ambiental.
- Verificar se processos envolvem inadimplência, violência, fraudes, ou organização criminosa.
- Considerar processo ativo se o status for: Em Andamento, Pendente, Recorrendo, Homologado.
- Se houver protestos ou ações financeiras em aberto, a chance de impacto financeiro é maior.

Retorne somente um objeto JSON (sem comentários, sem blocos de código), com as seguintes chaves:

{
  "total_processos": string (soma da Distribuição por Tipo de Parte),
  "acoes_criminais": boolean,
  "acoes_civeis": boolean,
  "acoes_ambientais": boolean,
  "acoes_que_pode_impactar_problemas_financeiros": boolean,
  "acoes_que_pode_indicar_mau_pagador": boolean,
  "isINMATE": boolean,
  "probabilidade_indicar_mau_pagador": "baixa" | "média" | "alta",
  "processo_ativo": boolean,
  "processo_indefinido": boolean,
  "probabilidade_impactar_problemas_financeiros": "baixa" | "média" | "alta",
  "maria_da_penha": boolean,
  "violencia_domestica": boolean,
  "estelionato": boolean,
  "furto": boolean,
  "roubo": boolean,
  "receptacao": boolean,
  "formacao_de_quadrilha": boolean,
  "fraude_bancaria": boolean,
  "cheque_sem_fundos": boolean,
  "inadimplemento_contratual": boolean,
  "inadimplemento_judicial": boolean,
  "execucao_fiscal": boolean,
  "acao_monitoria": boolean,
  "busca_e_apreensao": boolean,
  "recorrente_em_processos": boolean,
  "multiplo_envolvimento_criminal": boolean,
  "mensagem": string
}
`;

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getCompletionLawsuits(prompt: any): Promise<string> {
    let retries = 0;

    while (retries < this.maxRetries) {
      try {
        const response = await axios.post(
          this.apiUrl,
          {
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            system: this.systemPrompt,
            messages: [
              {
                role: 'user',
                content: `${JSON.stringify(prompt)}`,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'anthropic-version': '2023-06-01',
              'x-api-key': this.apiKey,
            },
          },
        );

        const result = response?.data?.content?.[0]?.text;

        if (result) {
          return result;
        } else {
          console.error(
            'Resposta inesperada:',
            JSON.stringify(response.data, null, 2),
          );
        }
      } catch (error) {
        const err = error.response?.data || error.message;
        if (error.response?.data?.error?.type === 'overloaded_error') {
          retries++;
          const delayTime = this.initialRetryDelay * Math.pow(2, retries - 1);
          console.warn(
            `API sobrecarregada. Tentando novamente em ${delayTime}ms... (Tentativa ${retries})`,
          );
          await this.delay(delayTime);
        } else {
          console.error('Erro ao consultar Claude:', err);
          break;
        }
      }
    }

    return 'error';
  }
}
