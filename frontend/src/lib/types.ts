export interface VerifyResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface OtpResponse {
  success: boolean;
  message: string;
}

export interface User {
  email: string;
  aadhaar_number: string;
  pan_number?: string;
  first_name: string;
  last_name: string;
  role: string;
}

export interface PropertyDoc {
  _id?: string;
  _rev?: string;
  property_id?: string;
  propert_id?: string; // fallback key used in your DB
  plot_number?: string;
  wallet?: string;
  // Display helpers
  title?: string; // optional legacy
  name?: string;  // optional legacy
  location?: string; // optional legacy
  type?: string;     // optional legacy
  status?: string;   // optional legacy
  value?: string | number; // optional legacy
  // Schema fields (some contain spaces; access via bracket notation)
  Village?: string;
  District?: string;
  State?: string;
  Category?: string;
  Current_use?: string;
  [key: string]: any;
}

export interface UserProfile {
  email: string;
  wallet_address?: string;
  Name?: string;
  FatherName?: string;
  MotherName?: string;
  DoB?: string;
  Gender?: string;
  Age?: number | string;
  ContactNo?: string;
  Address?: string;
  Aadhaar?: string;
  Pan?: string;
  Nationality?: string;
  properties_count?: number;
}

export interface UserProfileResponse {
  success: boolean;
  user?: UserProfile;
  message?: string;
}

export interface UserPropertiesResponse {
  success: boolean;
  properties: PropertyDoc[];
  count: number;
}

export interface MarketplaceProperty extends PropertyDoc {
  asking_price?: number;
  listed_date?: string;
  sale_status?: string;
  listed_for_sale: boolean;
}

export interface MarketplaceResponse {
  success: boolean;
  properties: MarketplaceProperty[];
  count: number;
  message?: string;
}

// Chat system types
export interface ChatMessage {
  message_id: string;
  sender_email: string;
  message_text: string;
  timestamp: string;
  read: boolean;
}

export interface Chat {
  chat_id: string;
  property_id: string;
  participants: string[];
  created_at: string;
  status: string;
}

export interface ChatWithDetails {
  chat_id: string;
  property_id: string;
  property_title: string;
  property_location: string;
  other_participant: string;
  last_message_at: string;
  created_at: string;
  status: string;
}

export interface ChatResponse {
  success: boolean;
  chat: Chat;
  messages?: ChatMessage[];
  count?: number;
  message?: string;
}

export interface ChatListResponse {
  success: boolean;
  chats: ChatWithDetails[];
  count: number;
  message?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: {
    message_id: string;
    chat_id: string;
    sender_email: string;
    message_text: string;
    timestamp: string;
  };
  message?: string;
}

export interface InitiateChatResponse {
  success: boolean;
  chat?: {
    chat_id: string;
    property_id: string;
    participants: string[];
    created_at: string;
  };
  message?: string;
}

// Transaction flow types
export interface Transaction {
  id: string;
  status: string;
}

export interface TxResponse {
  success: boolean;
  transaction?: Transaction;
  message?: string;
}
