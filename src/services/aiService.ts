import { v4 as uuidv4 } from 'uuid';
import type { ApiProfile, Message, Role } from '../types';

/**
 * 将群聊消息历史转换为 OpenAI Chat Completions 格式
 * 包含角色的 system prompt + 历史对话
 */
export function buildChatMessages(
  role: Role,
  history: Message[],
  maxMessages: number = 30,
): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: role.systemPrompt },
  ];

  // 取最近的历史消息
  const recentHistory = history.slice(-maxMessages);

  for (const msg of recentHistory) {
    if (msg.roleId === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else {
      // AI 消息，标明角色名
      messages.push({
        role: 'assistant',
        content: `[${msg.roleName}]说：${msg.content}`,
      });
    }
  }

  return messages;
}

/**
 * 调用 OpenAI 兼容 API，返回流式 AsyncIterable
 */
export async function* streamChat(
  apiProfile: ApiProfile,
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options?: { model?: string; temperature?: number },
): AsyncIterable<string> {
  const endpoint = apiProfile.endpoint.replace(/\/+$/, '');
  const url = `${endpoint}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiProfile.apiKey}`,
    },
    body: JSON.stringify({
      model: options?.model || apiProfile.defaultModel,
      messages,
      temperature: options?.temperature ?? apiProfile.temperature ?? 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留未完成的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;

        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        } catch {
          // 忽略解析错误
        }
      }
    }

    // 处理缓冲区剩余内容
    if (buffer.trim()) {
      const trimmed = buffer.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        } catch {
          // ignore
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/**
 * 生成错误消息
 */
export function createErrorMessage(error: unknown): Message {
  const message = error instanceof Error ? error.message : String(error);
  return {
    id: uuidv4(),
    roleId: 'system',
    roleName: '系统',
    content: `⚠️ ${message}`,
    timestamp: Date.now(),
    isError: true,
  };
}
