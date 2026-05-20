import { useRef, useEffect, useState } from 'react';
import { useChatroomStore } from '../stores/chatroomStore';
import { useRoleStore } from '../stores/roleStore';
import MessageBubble from './MessageBubble';
import MapView from './MapView';
import UserInput from './UserInput';
import {
  Play,
  Square,
  Trash2,
  Clock,
  ArrowLeft,
  MessageSquare,
  Bot,
  Map,
  MessageCircle,
} from 'lucide-react';

export default function ChatView() {
  const chatrooms = useChatroomStore((s) => s.chatrooms);
  const activeChatroomId = useChatroomStore((s) => s.activeChatroomId);
  const selectChatroom = useChatroomStore((s) => s.selectChatroom);
  const startChat = useChatroomStore((s) => s.startChat);
  const stopChat = useChatroomStore((s) => s.stopChat);
  const addUserMessage = useChatroomStore((s) => s.addUserMessage);
  const clearMessages = useChatroomStore((s) => s.clearMessages);
  const updateChatroom = useChatroomStore((s) => s.updateChatroom);
  const roles = useRoleStore((s) => s.roles);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [turnDelay, setTurnDelay] = useState(1500);
  const [mapMode, setMapMode] = useState(false);
  const [mentionHint, setMentionHint] = useState('');

  const chatroom = chatrooms.find((c) => c.id === activeChatroomId);

  useEffect(() => {
    if (chatroom) {
      setTurnDelay(chatroom.settings.turnDelayMs);
    }
  }, [chatroom?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatroom?.messageHistory.length]);

  if (!chatroom) {
    return (
      <div className="select-hint">
        <MessageSquare className="icon" size={64} />
        <p>选择一个群聊开始对话</p>
      </div>
    );
  }

  const memberRoles = chatroom.memberRoleIds
    .map((rid) => roles.find((r) => r.id === rid))
    .filter(Boolean);

  const isRunning = chatroom.status === 'running';
  const currentSpeaker = chatroom.currentSpeakerRoleId
    ? roles.find((r) => r.id === chatroom.currentSpeakerRoleId)
    : null;

  const handleSend = (content: string) => {
    addUserMessage(chatroom.id, content);
    if (isRunning) {
      stopChat(chatroom.id);
    }
    setTimeout(() => startChat(chatroom.id, 'mention'), 300);
  };

  const handleStartStop = () => {
    if (isRunning) {
      stopChat(chatroom.id);
    } else {
      startChat(chatroom.id, 'cycle');
    }
  };

  const handleDelayChange = (val: number) => {
    setTurnDelay(val);
    updateChatroom(chatroom.id, {
      settings: { ...chatroom.settings, turnDelayMs: val },
    });
  };

  const handleMapMention = (roleName: string) => {
    setMentionHint(`@${roleName} `);
  };

  return (
    <div className="chat-view">
      {/* 聊天头部 */}
      <div className="chat-header">
        <div className="chat-header-left">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => selectChatroom('')}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="chat-header-name">{chatroom.name}</div>
            <div className="chat-header-members">
              <Bot size={12} />
              {memberRoles.map((r) => r?.name).join(' · ')}
            </div>
          </div>
        </div>

        <div className="chat-header-controls">
          <div className="chat-settings">
            <Clock size={14} />
            <input
              type="range"
              min="500"
              max="5000"
              step="100"
              value={turnDelay}
              onChange={(e) => handleDelayChange(parseInt(e.target.value))}
            />
            <span>{(turnDelay / 1000).toFixed(1)}s</span>
          </div>

          {currentSpeaker && isRunning && (
            <div className="speaker-indicator">
              <span>💬 {currentSpeaker.name} 正在发言...</span>
            </div>
          )}

          {/* 地图/列表切换 */}
          <button
            className={`btn btn-sm ${mapMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setMapMode(!mapMode)}
            title={mapMode ? '切换列表模式' : '切换地图模式'}
          >
            {mapMode ? <MessageCircle size={14} /> : <Map size={14} />}
            {mapMode ? '列表' : '地图'}
          </button>

          <button
            className={`btn btn-sm ${isRunning ? 'btn-danger' : 'btn-success'}`}
            onClick={handleStartStop}
          >
            {isRunning ? (
              <><Square size={14} /> 停止</>
            ) : (
              <><Play size={14} /> 开始</>
            )}
          </button>

          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--error)' }}
            onClick={() => {
              if (confirm('确定清空所有对话？')) {
                if (isRunning) stopChat(chatroom.id);
                clearMessages(chatroom.id);
              }
            }}
          >
            <Trash2 size={14} />
            清空
          </button>
        </div>
      </div>

      {/* 消息列表 / 地图视图 */}
      {mapMode ? (
        <div className="messages-container map-mode-container">
          <MapView chatroomId={chatroom.id} onMention={handleMapMention} />
        </div>
      ) : (
        <div className="messages-container">
          {chatroom.messageHistory.length === 0 ? (
            <div className="empty-messages">
              <EmptyChatIcon />
              <p>对话为空</p>
              <p style={{ fontSize: 12 }}>
                发送消息时用 <strong>@角色名</strong> 提及 AI 角色，或点击「地图」切换地图模式
              </p>
            </div>
          ) : (
            chatroom.messageHistory.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isUser={msg.roleId === 'user'}
                isSystem={msg.roleId === 'system'}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 输入区 */}
      <UserInput
        onSend={handleSend}
        disabled={chatroom.memberRoleIds.length === 0}
        prefill={mentionHint}
        onPrefillUsed={() => setMentionHint('')}
        placeholder={
          chatroom.memberRoleIds.length === 0
            ? '请先添加成员到群聊'
            : '输入消息... @角色名 提及 AI'
        }
      />
    </div>
  );
}

function EmptyChatIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="12" y1="8" x2="12" y2="14" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}
