import axios from 'axios';

interface ChatPDFQueryResponse {
  content: string;
  sourceId: string;
}

export class ChatPDFExtractor {
  private apiKey: string = 'sec_jWckmgirw4tLkT6sX4N3wWqdMePSw8rn';
  private baseUrl: string = 'https://api.chatpdf.com/v1';

  async extractContent(sourceId: string, query: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/chats/message`,
        {
          sourceId,
          messages: [
            {
              role: 'user',
              content: query,
            },
          ],
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data as ChatPDFQueryResponse;
      return data.content;
    } catch (error) {
      console.error(
        'Erro ao extrair conteúdo:',
        error.response?.data || error.message,
      );
      return `Erro ao extrair conteúdo: ${error.message}`;
    }
  }

  async extract(sourceId: string, query: string): Promise<string> {
    try {
      return await this.extractContent(sourceId, query);
    } catch (error) {
      console.error('Falha na extração do IRPF/DRE:', error);
      return `Erro ao processar o documento: ${error.message}`;
    }
  }
}
