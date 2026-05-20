import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Chatroom, Message, ChatroomSettings } from '../types';
import { storageService } from '../services/storageService';
import { useConfigStore } from './configStore';
import { useRoleStore } from './roleStore';
import { buildChatMessages, streamChat } from '../services/aiService';

const DEFAULT_SETTINGS: ChatroomSettings = {
  turnDelayMs: 1500,
  maxHistoryMessages: 30,
};

interface ChatroomState {
  chatrooms: Chatroom[];
  activeChatroomId: string | null;
  abortController: AbortController | null;

  loadFromStorage: () => void;
  addChatroom: (name: string, memberRoleIds: string[]) => string;
  removeChatroom: (id: string) => void;
  updateChatroom: (id: string, data: Partial<Chatroom>) => void;
  selectChatroom: (id: string) => void;
  getChatroom: (id: string) => Chatroom | undefined;

  // 消息操作
  addUserMessage: (chatroomId: string, content: string) => void;
  clearMessages: (chatroomId: string) => void;
  addAssistantMessage: (chatroomId: string, roleId: string, roleName: string) => Message;
  updateAssistantMessage: (chatroomId: string, messageId: string, content: string) => void;
  finishAssistantMessage: (chatroomId: string, messageId: string) => void;

  // 对话控制
  startChat: (chatroomId: string, mode?: 'mention' | 'cycle') => Promise<void>;
  stopChat: (chatroomId: string) => void;
}

export const useChatroomStore = create<ChatroomState>((set, get) => ({
  chatrooms: [],
  activeChatroomId: null,
  abortController: null,

  loadFromStorage: () => {
    set({ chatrooms: storageService.loadChatrooms() });
  },

  addChatroom: (name, memberRoleIds) => {
    const id = uuidv4();
    const newChatroom: Chatroom = {
      id,
      name,
      memberRoleIds,
      messageHistory: [],
      settings: { ...DEFAULT_SETTINGS },
      status: 'idle',
    };
    set((state) => {
      const updated = [...state.chatrooms, newChatroom];
      storageService.saveChatrooms(updated);
      return { chatrooms: updated, activeChatroomId: state.activeChatroomId || id };
    });
    return id;
  },

  removeChatroom: (id) => {
    set((state) => {
      const updated = state.chatrooms.filter((c) => c.id !== id);
      storageService.saveChatrooms(updated);
      return {
        chatrooms: updated,
        activeChatroomId: state.activeChatroomId === id ? null : state.activeChatroomId,
      };
    });
  },

  updateChatroom: (id, data) => {
    set((state) => {
      const updated = state.chatrooms.map((c) =>
        c.id === id ? { ...c, ...data } : c
      );
      storageService.saveChatrooms(updated);
      return { chatrooms: updated };
    });
  },

  selectChatroom: (id) => set({ activeChatroomId: id }),

  getChatroom: (id) => get().chatrooms.find((c) => c.id === id),

  addUserMessage: (chatroomId, content) => {
    const msg: Message = {
      id: uuidv4(),
      roleId: 'user',
      roleName: '你',
      content,
      timestamp: Date.now(),
    };
    set((state) => {
      const updated = state.chatrooms.map((c) => {
        if (c.id !== chatroomId) return c;
        return { ...c, messageHistory: [...c.messageHistory, msg] };
      });
      storageService.saveChatrooms(updated);
      return { chatrooms: updated };
    });
  },

  clearMessages: (chatroomId) => {
    set((state) => {
      const updated = state.chatrooms.map((c) => {
        if (c.id !== chatroomId) return c;
        return { ...c, messageHistory: [], status: 'idle', currentSpeakerRoleId: undefined };
      });
      storageService.saveChatrooms(updated);
      return { chatrooms: updated };
    });
  },

  addAssistantMessage: (chatroomId, roleId, roleName) => {
    const msg: Message = {
      id: uuidv4(),
      roleId,
      roleName,
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    };
    set((state) => {
      const updated = state.chatrooms.map((c) => {
        if (c.id !== chatroomId) return c;
        return { ...c, messageHistory: [...c.messageHistory, msg] };
      });
      return { chatrooms: updated };
    });
    return msg;
  },

  updateAssistantMessage: (chatroomId, messageId, content) => {
    set((state) => {
      const updated = state.chatrooms.map((c) => {
        if (c.id !== chatroomId) return c;
        return {
          ...c,
          messageHistory: c.messageHistory.map((m) =>
            m.id === messageId ? { ...m, content } : m
          ),
        };
      });
      return { chatrooms: updated };
    });
  },

  finishAssistantMessage: (chatroomId, messageId) => {
    set((state) => {
      const updated = state.chatrooms.map((c) => {
        if (c.id !== chatroomId) return c;
        return {
          ...c,
          messageHistory: c.messageHistory.map((m) =>
            m.id === messageId ? { ...m, isStreaming: false } : m
          ),
        };
      });
      storageService.saveChatrooms(updated);
      return { chatrooms: updated };
    });
  },

  startChat: async (chatroomId, mode = 'cycle') => {
    const state = get();
    const chatroom = state.chatrooms.find((c) => c.id === chatroomId);
    if (!chatroom || chatroom.memberRoleIds.length === 0) return;

    // 停止任何已有的对话
    state.abortController?.abort();

    const abortController = new AbortController();
    set({ abortController });

    const updateStatus = (status: 'running' | 'idle', speakerRoleId?: string) => {
      set((s) => ({
        chatrooms: s.chatrooms.map((c) =>
          c.id === chatroomId
            ? { ...c, status, currentSpeakerRoleId: speakerRoleId }
            : c
        ),
      }));
    };

    updateStatus('running');

    const configStore = useConfigStore.getState();
    const roleStore = useRoleStore.getState();

    // ========== @提及模式：根据用户消息中的 @角色名 决定谁发言 ==========
    if (mode === 'mention') {
      const lastMessage = chatroom.messageHistory[chatroom.messageHistory.length - 1];
      if (!lastMessage || lastMessage.roleId !== 'user') {
        updateStatus('idle');
        return;
      }

      // 获取群聊中所有角色的名字
      const memberNames = chatroom.memberRoleIds
        .map((rid) => roleStore.getRole(rid))
        .filter(Boolean) as import('../types').Role[];

      const mentions = extractMentions(lastMessage.content, memberNames.map((r) => r.name));

      let targetRoles: import('../types').Role[] = [];
      if (mentions.includes('__all__')) {
        // @all → 所有角色都回复
        targetRoles = memberNames;
      } else if (mentions.length > 0) {
        // 只找被 @ 的角色
        targetRoles = memberNames.filter((r) => mentions.includes(r.name));
      }

      if (targetRoles.length === 0) {
        // 没有 @ 任何人，不触发 AI 回复
        updateStatus('idle');
        return;
      }

      // 依次让被 @ 的角色发言
      for (const role of targetRoles) {
        if (abortController.signal.aborted) break;

        updateStatus('running', role.id);

        // 添加空的流式消息
        const msg = get().addAssistantMessage(chatroomId, role.id, role.name);

        // 获取 API 配置
        const apiProfile = configStore.getProfile(role.apiProfileId);
        if (!apiProfile) {
          const errorMsg = createErrorMsg(`角色「${role.name}」未配置有效的 API`);
          set((s) => ({
            chatrooms: s.chatrooms.map((c) =>
              c.id === chatroomId
                ? { ...c, messageHistory: [...c.messageHistory, errorMsg] }
                : c
            ),
          }));
          continue;
        }

        // 构建消息历史
        const messages = buildChatMessages(role, getCurrentHistory(chatroomId), chatroom.settings.maxHistoryMessages);

        // 使用单独的 abort controller 来控制流
        const streamAbortController = new AbortController();
        abortController.signal.addEventListener('abort', () => {
          streamAbortController.abort();
        });

        try {
          let fullContent = '';
          for await (const chunk of streamChat(apiProfile, messages, {
            model: role.model || undefined,
            temperature: role.temperature,
          })) {
            if (streamAbortController.signal.aborted) break;
            fullContent += chunk;
            get().updateAssistantMessage(chatroomId, msg.id, fullContent);
          }

          if (!streamAbortController.signal.aborted) {
            get().finishAssistantMessage(chatroomId, msg.id);
          }
        } catch (error) {
          if (streamAbortController.signal.aborted) break;
          const errorMsg = createErrorMsg(`「${role.name}」回复失败: ${error instanceof Error ? error.message : String(error)}`);
          set((s) => ({
            chatrooms: s.chatrooms.map((c) =>
              c.id === chatroomId
                ? { ...c, messageHistory: [...c.messageHistory, errorMsg] }
                : c
            ),
          }));
        }

        // 角色间延迟
        await delay(getTurnDelay(chatroomId));
      }

      updateStatus('idle');
      return;
    }

    // ========== 循环模式：角色依次自动发言（点击「开始」按钮时） ==========
    const getNextSpeaker = (lastSpeakerIndex: number): { role: import('../types').Role; index: number } | null => {
      const currentChatroom = get().chatrooms.find((c) => c.id === chatroomId);
      if (!currentChatroom) return null;

      const memberIds = currentChatroom.memberRoleIds;
      if (memberIds.length === 0) return null;

      const nextIndex = (lastSpeakerIndex + 1) % memberIds.length;
      const role = roleStore.getRole(memberIds[nextIndex]);
      return role ? { role, index: nextIndex } : null;
    };

    const speak = async (lastSpeakerIndex: number): Promise<void> => {
      if (abortController.signal.aborted) {
        updateStatus('idle');
        return;
      }

      const currentChatroom = get().chatrooms.find((c) => c.id === chatroomId);
      if (!currentChatroom || currentChatroom.status !== 'running') return;

      const next = getNextSpeaker(lastSpeakerIndex);
      if (!next) {
        updateStatus('idle');
        return;
      }

      const { role, index } = next;
      updateStatus('running', role.id);

      const msg = get().addAssistantMessage(chatroomId, role.id, role.name);

      const apiProfile = configStore.getProfile(role.apiProfileId);
      if (!apiProfile) {
        const errorMsg = createErrorMsg(`角色「${role.name}」未配置有效的 API`);
        set((s) => ({
          chatrooms: s.chatrooms.map((c) =>
            c.id === chatroomId
              ? { ...c, messageHistory: [...c.messageHistory, errorMsg] }
              : c
          ),
        }));
        await delay(getTurnDelay(chatroomId));
        return speak(index);
      }

      const messages = buildChatMessages(role, getCurrentHistory(chatroomId), currentChatroom.settings.maxHistoryMessages);

      const streamAbortController = new AbortController();
      abortController.signal.addEventListener('abort', () => {
        streamAbortController.abort();
      });

      try {
        let fullContent = '';
        for await (const chunk of streamChat(apiProfile, messages, {
          model: role.model || undefined,
          temperature: role.temperature,
        })) {
          if (streamAbortController.signal.aborted) break;
          fullContent += chunk;
          get().updateAssistantMessage(chatroomId, msg.id, fullContent);
        }

        if (!streamAbortController.signal.aborted) {
          get().finishAssistantMessage(chatroomId, msg.id);
        }
      } catch (error) {
        if (streamAbortController.signal.aborted) return;
        const errorMsg = createErrorMsg(`「${role.name}」回复失败: ${error instanceof Error ? error.message : String(error)}`);
        set((s) => ({
          chatrooms: s.chatrooms.map((c) =>
            c.id === chatroomId
              ? { ...c, messageHistory: [...c.messageHistory, errorMsg] }
              : c
          ),
        }));
      }

      if (abortController.signal.aborted) {
        updateStatus('idle');
        return;
      }

      await delay(getTurnDelay(chatroomId));
      return speak(index);
    };

    const startIndex = chatroom.memberRoleIds.findIndex(
      (rid) => rid === chatroom.currentSpeakerRoleId
    );
    speak(startIndex >= 0 ? startIndex : -1).catch(() => updateStatus('idle'));
  },

  stopChat: (chatroomId) => {
    const state = get();
    state.abortController?.abort();
    set({ abortController: null });
    set((s) => ({
      chatrooms: s.chatrooms.map((c) =>
        c.id === chatroomId ? { ...c, status: 'idle', currentSpeakerRoleId: undefined } : c
      ),
    }));
  },
}));

// ===== Helper Functions =====

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createErrorMsg(content: string): Message {
  return {
    id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
    roleId: 'system',
    roleName: '系统',
    content: `⚠️ ${content}`,
    timestamp: Date.now(),
    isError: true,
  };
}

function getTurnDelay(chatroomId: string): number {
  const chatroom = useChatroomStore.getState().chatrooms.find((c) => c.id === chatroomId);
  return chatroom?.settings?.turnDelayMs ?? 1500;
}

function getCurrentHistory(chatroomId: string): Message[] {
  const chatroom = useChatroomStore.getState().chatrooms.find((c) => c.id === chatroomId);
  return chatroom?.messageHistory || [];
}

// ===== @提及提取 =====

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 从文本中提取 @角色名 提及
 * 返回匹配的角色名数组，如果包含 @all 则返回 ['__all__']
 */
export function extractMentions(text: string, roleNames: string[]): string[] {
  // 先检查 @all
  if (/@all/i.test(text)) {
    return ['__all__'];
  }

  const found: string[] = [];
  for (const name of roleNames) {
    const regex = new RegExp(`@${escapeRegExp(name)}`);
    if (regex.test(text)) {
      found.push(name);
    }
  }
  return found;
}

