import { VerifyResponse, OtpResponse, UserProfileResponse, UserPropertiesResponse, MarketplaceResponse, ChatResponse, ChatListResponse, SendMessageResponse, InitiateChatResponse } from './types';

const API_BASE_URL = 'http://localhost:8000';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }
    
    return response.json();
  }

  async verifyAadhaarPan(data: { aadhaar?: string; pan?: string }) {
    return this.request<VerifyResponse>('/verify/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async verifyOtp(data: { email: string; otp: string }) {
    return this.request<OtpResponse>('/verify-otp/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserProfile(email: string) {
    const body = new URLSearchParams({ email });
    return this.request<UserProfileResponse>('/api/property/user-profile/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  }

  async getUserProperties(wallet_address: string) {
    const params = new URLSearchParams({ wallet_address });
    return this.request<UserPropertiesResponse>(`/api/property/user-properties/?${params.toString()}`);
  }

  async getPropertyDetails(property_id: string) {
    return this.request<{ success: boolean; property?: any; message?: string }>(`/api/property/property/${encodeURIComponent(property_id)}/`);
  }

  async listPropertyForSale(property_id: string, price: number) {
    return this.request<{ success: boolean; property?: any; message?: string }>(`/api/property/flag-property-for-sale/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ property_id, price }),
    });
  }

  async getMarketplaceProperties() {
    return this.request<MarketplaceResponse>('/api/property/marketplace/');
  }

  // Chat system methods
  async initiateChat(property_id: string, buyer_email: string, seller_email?: string) {
    return this.request<InitiateChatResponse>('/api/property/chats/initiate/', {
      method: 'POST',
      body: JSON.stringify({ property_id, buyer_email, seller_email }),
    });
  }

  async sendMessage(chat_id: string, sender_email: string, message: string) {
    return this.request<SendMessageResponse>('/api/property/chats/send-message/', {
      method: 'POST',
      body: JSON.stringify({ chat_id, sender_email, message }),
    });
  }

  async getChatHistory(chat_id: string, user_email?: string) {
    const params = user_email ? `?user_email=${encodeURIComponent(user_email)}` : '';
    return this.request<ChatResponse>(`/api/property/chats/${chat_id}/messages/${params}`);
  }

  async getChatInfo(chat_id: string) {
    return this.request<{ success: boolean; chat: any; property?: any; message?: string }>(
      `/api/property/chats/${chat_id}/info/`
    );
  }

  async getUserChats(user_email: string) {
    return this.request<ChatListResponse>('/api/property/chats/user-chats/', {
      method: 'POST',
      body: JSON.stringify({ user_email }),
    });
  }

  // Transactions
  async initiateTransfer(property_id: string, seller_email: string, buyer_email: string) {
    return this.request<TxResponse>('/api/property/transactions/initiate/', {
      method: 'POST',
      body: JSON.stringify({ property_id, seller_email, buyer_email }),
    });
  }

  async verifySellerOtp(transaction_id: string, seller_email: string, otp: string) {
    return this.request<TxResponse>('/api/property/transactions/verify-seller-otp/', {
      method: 'POST',
      body: JSON.stringify({ transaction_id, seller_email, otp }),
    });
  }

  async verifyBuyerOtp(transaction_id: string, buyer_email: string, otp: string) {
    return this.request<TxResponse>('/api/property/transactions/verify-buyer-otp/', {
      method: 'POST',
      body: JSON.stringify({ transaction_id, buyer_email, otp }),
    });
  }

  async requestBuyerOtp(transaction_id: string, buyer_email: string) {
    return this.request<TxResponse>('/api/property/transactions/request-buyer-otp/', {
      method: 'POST',
      body: JSON.stringify({ transaction_id, buyer_email }),
    });
  }

  async surveyorApprove(transaction_id: string, surveyor_email: string, report_url?: string) {
    return this.request<TxResponse>('/api/property/transactions/surveyor-approve/', {
      method: 'POST',
      body: JSON.stringify({ transaction_id, surveyor_email, report_url }),
    });
  }

  async buyerAgree(transaction_id: string, buyer_email: string, agree: boolean) {
    return this.request<TxResponse>('/api/property/transactions/buyer-agree/', {
      method: 'POST',
      body: JSON.stringify({ transaction_id, buyer_email, agree }),
    });
  }

  async getUserTransactions(user_email: string, role?: 'buyer' | 'seller') {
    return this.request<TransactionsListResponse>('/api/property/transactions/list/', {
      method: 'POST',
      body: JSON.stringify({ user_email, role }),
    });
  }

  // Surveyor APIs
  async loginSurveyor(email: string) {
    return this.request<{ success: boolean; profile?: any; message?: string }>('/api/property/surveyor/login/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async listSurveyorPending(email: string) {
    return this.request<{ success: boolean; transactions: any[]; count: number; message?: string }>('/api/property/surveyor/pending/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
}

export const apiClient = new ApiClient();
