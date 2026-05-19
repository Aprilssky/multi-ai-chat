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
  startChat: (chatroomId: string) => Promise<void>;
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

  startChat: async (chatroomId) => {
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

    // 确定角色发言顺序
    const getNextSpeaker = (lastSpeakerIndex: number): { role: import('../types').Role; index: number } | null => {
      const currentChatroom = get().chatrooms.find((c) => c.id === chatroomId);
      if (!currentChatroom) return null;

      const memberIds = currentChatroom.memberRoleIds;
      if (memberIds.length === 0) return null;

      const nextIndex = (lastSpeakerIndex + 1) % memberIds.length;
      const role = roleStore.getRole(memberIds[nextIndex]);
      return role ? { role, index: nextIndex } : null;
    };

    // 定义发言函数
    const speak = async (lastSpeakerIndex: number): Promise<void> => {
      // 检查是否被中止
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
        // 继续下一个角色
        await delay(getTurnDelay(chatroomId));
        return speak(index);
      }

      // 构建消息历史
      const messages = buildChatMessages(role, getCurrentHistory(chatroomId), currentChatroom.settings.maxHistoryMessages);

      // 使用单独的 abort controller 来控制流
      const streamAbortController = new AbortController();
      // 注册到主 abort controller
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

      // 延迟后进入下一个角色
      if (abortController.signal.aborted) {
        updateStatus('idle');
        return;
      }

      await delay(getTurnDelay(chatroomId));
      return speak(index);
    };

    // 从当前或上一个发言者之后开始
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
