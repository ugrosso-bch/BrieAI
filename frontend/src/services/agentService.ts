import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface AgentChatRequest {
  message: string;
  sessionId?: string;
}

export interface AgentChatResponse {
  response: string;
  sessionId: string;
  mode: 'agent';
}

export interface AgentStatus {
  available: boolean;
  error?: string;
  agentId: string;
  aliasId: string;
}

class AgentService {
  async sendMessage(request: AgentChatRequest): Promise<AgentChatResponse> {
    try {
      const response = await axios.post<AgentChatResponse>(`${API_BASE_URL}/agent/chat`, request);
      return response.data;
    } catch (error: any) {
      console.error('Error enviando mensaje al Agent:', error);
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error(`Error de conexión: ${error.message}`);
    }
  }

  async checkStatus(): Promise<AgentStatus> {
    try {
      const response = await axios.get<AgentStatus>(`${API_BASE_URL}/agent/status`);
      return response.data;
    } catch (error) {
      console.error('Error verificando estado del Agent:', error);
      return {
        available: false,
        error: 'Error verificando estado del Agent',
        agentId: 'N/A',
        aliasId: 'N/A'
      };
    }
  }
}

export default new AgentService();