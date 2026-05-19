import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Subscription {
  SubscriptionArn: string;
  Endpoint: string;
  Protocol: string;
  Owner?: string;
  TopicArn?: string;
}

class NotificationService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async subscribeEmail(email: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/subscribe`,
        { email },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error suscribiendo email');
    }
  }

  async unsubscribeEmail(subscriptionArn: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/unsubscribe`,
        { subscriptionArn },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error desuscribiendo email');
    }
  }

  async getSubscriptions(): Promise<Subscription[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/notifications/subscriptions`,
        { headers: this.getAuthHeaders() }
      );
      return response.data as Subscription[];
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error obteniendo suscripciones');
    }
  }

  async sendTestNotification() {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/notifications/test`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Error enviando notificación de prueba');
    }
  }
}

export default new NotificationService();