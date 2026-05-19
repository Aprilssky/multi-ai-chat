import { useState } from 'react';
import { useChatroomStore } from '../stores/chatroomStore';
import { useRoleStore } from '../stores/roleStore';
import ChatView from './ChatView';
import { Plus, Trash2, MessageSquare } from 'lucide-react';

export default function ChatroomManager() {
  const chatrooms = useChatroomStore((s) => s.chatrooms);
  const activeChatroomId = useChatroomStore((s) => s.activeChatroomId);
  const addChatroom = useChatroomStore((s) => s.addChatroom);
  const removeChatroom = useChatroomStore((s) => s.removeChatroom);
  const selectChatroom = useChatroomStore((s) => s.selectChatroom);
  const roles = useRoleStore((s) => s.roles);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreate = () => {
    if (!newName.trim()) {
      alert('请输入群聊名称');
      return;
    }
    if (selectedMembers.length === 0) {
      alert('请至少选择一个成员');
      return;
    }
    addChatroom(newName.trim(), selectedMembers);
    setShowCreate(false);
    setNewName('');
    setSelectedMembers([]);
  };

  // 如果已选中群聊，显示聊天视图
  if (activeChatroomId) {
    const activeChatroom = chatrooms.find((c) => c.id === activeChatroomId);
    if (activeChatroom) {
      return (
        <div style={{ display: 'flex', height: '100%' }}>
          {/* 左侧群聊列表 */}
          <div className="chatroom-sidebar">
            <div className="chatroom-sidebar-header">
              <span style={{ fontWeight: 600, fontSize: 14 }}>群聊列表</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(true)}>
                <Plus size={16} />
              </button>
            </div>
            <div className="chatroom-sidebar-list">
              {chatrooms.length === 0 ? (
                <div className="no-items">暂无群聊</div>
              ) : (
                chatrooms.map((cr) => (
                  <div
                    key={cr.id}
                    className={`chatroom-item ${cr.id === activeChatroomId ? 'active' : ''}`}
                    onClick={() => selectChatroom(cr.id)}
                  >
                    <div className="chatroom-info">
                      <div className="chatroom-name">{cr.name}</div>
                      <div className="chatroom-meta">
                        {cr.memberRoleIds.length} 个成员 · {cr.messageHistory.length} 条消息
                        {cr.status === 'running' && (
                          <span className="status-badge running" style={{ marginLeft: 8 }}>
                            ● 进行中
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--error)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`确定删除群聊「${cr.name}」？`)) {
                          if (cr.id === activeChatroomId) selectChatroom(chatrooms.find(c => c.id !== cr.id)?.id || '');
                          removeChatroom(cr.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 聊天视图 */}
          <div className="app-main">
            <ChatView />
          </div>
        </div>
      );
    }
  }

  // 无选中群聊时的默认视图
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-title">群聊管理</div>
      <div className="page-subtitle">创建和管理多 AI 群聊</div>

      <div style={{ padding: '0 24px 12px' }}>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          创建群聊
        </button>
      </div>

      <div className="page-content">
        {chatrooms.length === 0 ? (
          <div className="empty-state">
            <MessageSquareIcon />
            <h3>还没有群聊</h3>
            <p>创建一个群聊，添加多个 AI 角色，让它们开始自动对话</p>
          </div>
        ) : (
          <div className="chatroom-list">
            {chatrooms.map((cr) => (
              <div
                key={cr.id}
                className="chatroom-item"
                onClick={() => selectChatroom(cr.id)}
              >
                <div className="chatroom-info">
                  <div className="chatroom-name">{cr.name}</div>
                  <div className="chatroom-meta">
                    {cr.memberRoleIds.length} 个成员 · {cr.messageHistory.length} 条消息
                    {cr.status === 'running' && (
                      <span className="status-badge running" style={{ marginLeft: 8 }}>
                        ● 进行中
                      </span>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--error)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`确定删除群聊「${cr.name}」？`)) {
                      removeChatroom(cr.id);
                    }
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建群聊 Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">创建群聊</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">群聊名称</label>
                <input
                  className="form-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例如：哲学茶话会"
                />
              </div>

              <div className="form-group">
                <label className="form-label">选择成员</label>
                {roles.length === 0 ? (
                  <div className="no-roles-hint">
                    还没有角色。请先在「角色」页面创建一些 AI 角色。
                  </div>
                ) : (
                  <div className="members-container">
                    <div className="member-select">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          className={`member-chip ${selectedMembers.includes(role.id) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedMembers((prev) =>
                              prev.includes(role.id)
                                ? prev.filter((id) => id !== role.id)
                                : [...prev, role.id]
                            );
                          }}
                        >
                          <span className="emoji">{role.avatar || '🤖'}</span>
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="form-hint">已选择 {selectedMembers.length} 个成员</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleCreate}>
                创建群聊
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageSquareIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
