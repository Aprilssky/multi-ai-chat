// ===== API 配置 =====
export interface ApiProfile {
  id: string;
  name: string;
  endpoint: string;
  defaultModel: string;
  apiKey: string; // 明文仅在内存中使用，存 localStorage 时加密
  // 可选高级配置
  temperature?: number;
}

// ===== 角色 =====
export interface Role {
  id: string;
  name: string;
  avatar?: string; // emoji 或图片 URL
  systemPrompt: string;
  apiProfileId: string;
  model?: string;
  temperature?: number;
}

// ===== 消息 =====
export interface Message {
  id: string;
  roleId: string | 'user';
  roleName: string;
  content: string;
  timestamp: number;
  isStreaming?: boolean;
  isError?: boolean;
}

// ===== 群聊 =====
export interface Chatroom {
  id: string;
  name: string;
  memberRoleIds: string[];
  messageHistory: Message[];
  settings: ChatroomSettings;
  status: 'idle' | 'running';
  currentSpeakerRoleId?: string;
}

export interface ChatroomSettings {
  turnDelayMs: number;
  maxHistoryMessages?: number; // 构建上下文时保留最近的消息数
  maxContextTokens?: number;
}

// ===== 存储结构 =====
export interface ExportData {
  version: number;
  exportedAt: number;
  apiProfiles: ApiProfile[];
  roles: Role[];
  chatrooms: Omit<Chatroom, 'status' | 'currentSpeakerRoleId'>[];
}

// ===== 加密 =====
export interface EncryptedStore {
  iv: string;
  ciphertext: string;
}

// ===== 状态 =====
export type ViewType = 'roles' | 'chatrooms' | 'settings';
