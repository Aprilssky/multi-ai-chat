import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '../types';
import { useRoleStore } from '../stores/roleStore';

interface Props {
  message: Message;
  isUser: boolean;
  isSystem: boolean;
}

export default function MessageBubble({ message, isUser, isSystem }: Props) {
  const role = !isUser && !isSystem ? useRoleStore.getState().getRole(message.roleId) : undefined;

  const avatar = isUser ? '👤' : isSystem ? '⚙️' : role?.avatar || '🤖';

  const bubbleClass = isUser ? 'message user' : isSystem ? 'message system' : 'message';

  return (
    <div className={bubbleClass}>
      <div className="message-avatar">{avatar}</div>
      <div className="message-body">
        <div className="message-name">{message.roleName}</div>
        <div className="message-content">
          {message.isStreaming && !message.content ? (
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            isUser ? (
              <p>{message.content}</p>
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            )
          )}
        </div>
        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {message.isStreaming && ' ● 输入中...'}
          {message.isError && ' ⚠️ 错误'}
        </div>
      </div>
    </div>
  );
}
