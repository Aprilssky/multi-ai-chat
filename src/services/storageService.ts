import type { ApiProfile, Role, Chatroom, ExportData } from '../types';
import { encryptApiKey, decryptApiKey } from './encryptionService';

const KEYS = {
  API_PROFILES: 'ai_chat_api_profiles',
  ROLES: 'ai_chat_roles',
  CHATROOMS: 'ai_chat_chatrooms',
  ENCRYPTION_SALT: 'ai_chat_encryption_salt',
} as const;

const ENCRYPTION_PASSWORD = 'browser-local-key-v1';

export const storageService = {
  // ===== API Profiles =====
  saveApiProfiles(profiles: ApiProfile[]) {
    const toStore = profiles.map(p => ({
      ...p,
      apiKey: encryptApiKey(p.apiKey, ENCRYPTION_PASSWORD),
    }));
    localStorage.setItem(KEYS.API_PROFILES, JSON.stringify(toStore));
  },

  loadApiProfiles(): ApiProfile[] {
    try {
      const raw = localStorage.getItem(KEYS.API_PROFILES);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as ApiProfile[];
      return parsed.map(p => ({
        ...p,
        apiKey: decryptApiKey(p.apiKey, ENCRYPTION_PASSWORD),
      }));
    } catch {
      return [];
    }
  },

  // ===== Roles =====
  saveRoles(roles: Role[]) {
    localStorage.setItem(KEYS.ROLES, JSON.stringify(roles));
  },

  loadRoles(): Role[] {
    try {
      const raw = localStorage.getItem(KEYS.ROLES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ===== Chatrooms =====
  saveChatrooms(chatrooms: Chatroom[]) {
    // 清理运行时状态再存储
    const toStore = chatrooms.map(cr => ({
      ...cr,
      status: 'idle' as const,
      currentSpeakerRoleId: undefined,
    }));
    localStorage.setItem(KEYS.CHATROOMS, JSON.stringify(toStore));
  },

  loadChatrooms(): Chatroom[] {
    try {
      const raw = localStorage.getItem(KEYS.CHATROOMS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  // ===== 导入导出 =====
  exportAll(profiles: ApiProfile[], roles: Role[], chatrooms: Chatroom[]): ExportData {
    return {
      version: 1,
      exportedAt: Date.now(),
      apiProfiles: profiles,
      roles,
      chatrooms: chatrooms.map(({ status: _, currentSpeakerRoleId: __, ...rest }) => rest),
    };
  },

  importAll(data: ExportData): { profiles: ApiProfile[]; roles: Role[]; chatrooms: Chatroom[] } | null {
    if (!data || data.version !== 1) return null;
    return {
      profiles: data.apiProfiles || [],
      roles: data.roles || [],
      chatrooms: (data.chatrooms || []).map(cr => ({
        ...cr,
        status: 'idle' as const,
        currentSpeakerRoleId: undefined,
      })),
    };
  },

  clearAll() {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};
