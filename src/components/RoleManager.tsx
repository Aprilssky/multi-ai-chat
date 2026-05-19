import { useState } from 'react';
import { useRoleStore } from '../stores/roleStore';
import { useConfigStore } from '../stores/configStore';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Role } from '../types';

const DEFAULT_AVATARS = ['🤖', '🧠', '🎨', '🔬', '📚', '🎭', '🌍', '💡', '🎵', '📐'];

export default function RoleManager() {
  const roles = useRoleStore((s) => s.roles);
  const addRole = useRoleStore((s) => s.addRole);
  const updateRole = useRoleStore((s) => s.updateRole);
  const removeRole = useRoleStore((s) => s.removeRole);
  const apiProfiles = useConfigStore((s) => s.apiProfiles);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form, setForm] = useState({
    name: '',
    avatar: '🤖',
    systemPrompt: '',
    apiProfileId: '',
    model: '',
    temperature: 0.7,
  });

  const openCreate = () => {
    setEditingRole(null);
    setForm({
      name: '',
      avatar: DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)],
      systemPrompt: '',
      apiProfileId: apiProfiles[0]?.id || '',
      model: '',
      temperature: 0.7,
    });
    setShowModal(true);
  };

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      avatar: role.avatar || '🤖',
      systemPrompt: role.systemPrompt,
      apiProfileId: role.apiProfileId,
      model: role.model || '',
      temperature: role.temperature ?? 0.7,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('请输入角色名称');
      return;
    }
    if (!form.systemPrompt.trim()) {
      alert('请输入系统提示词');
      return;
    }
    if (!form.apiProfileId) {
      alert('请选择 API 配置');
      return;
    }

    if (editingRole) {
      updateRole(editingRole.id, {
        name: form.name.trim(),
        avatar: form.avatar,
        systemPrompt: form.systemPrompt.trim(),
        apiProfileId: form.apiProfileId,
        model: form.model.trim() || undefined,
        temperature: form.temperature,
      });
    } else {
      addRole({
        name: form.name.trim(),
        avatar: form.avatar,
        systemPrompt: form.systemPrompt.trim(),
        apiProfileId: form.apiProfileId,
        model: form.model.trim() || undefined,
        temperature: form.temperature,
      });
    }
    setShowModal(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-title">角色管理</div>
      <div className="page-subtitle">创建和管理 AI 角色</div>

      <div style={{ padding: '0 24px 12px' }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          创建角色
        </button>
      </div>

      <div className="page-content">
        {roles.length === 0 ? (
          <div className="empty-state">
            <BotIcon />
            <h3>还没有角色</h3>
            <p>创建你的第一个 AI 角色，为它设定独特的身份和系统提示词</p>
          </div>
        ) : (
          <div className="role-grid">
            {roles.map((role) => {
              const profile = apiProfiles.find((p) => p.id === role.apiProfileId);
              return (
                <div key={role.id} className="role-card">
                  <div className="role-card-header">
                    <div className="role-avatar">{role.avatar || '🤖'}</div>
                    <div>
                      <div className="role-name">{role.name}</div>
                      <div className="role-tag">{profile?.name || '未配置'}</div>
                    </div>
                  </div>
                  <div className="role-prompt">{role.systemPrompt}</div>
                  <div className="role-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(role)}>
                      <Pencil size={14} />
                      编辑
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--error)' }}
                      onClick={() => {
                        if (confirm(`确定删除角色「${role.name}」？`)) {
                          removeRole(role.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                      删除
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 创建/编辑 Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editingRole ? '编辑角色' : '创建角色'}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">头像</label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {DEFAULT_AVATARS.map((emoji) => (
                    <button
                      key={emoji}
                      className={`member-chip ${form.avatar === emoji ? 'selected' : ''}`}
                      onClick={() => setForm({ ...form, avatar: emoji })}
                    >
                      <span className="emoji">{emoji}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">角色名称</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：爱因斯坦"
                />
              </div>

              <div className="form-group">
                <label className="form-label">系统提示词</label>
                <textarea
                  className="form-textarea"
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="设定角色的性格、知识背景、说话风格..."
                  rows={5}
                />
                <div className="form-hint">提示词决定了角色的个性和回答方式</div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">API 配置</label>
                  <select
                    className="form-input"
                    value={form.apiProfileId}
                    onChange={(e) => setForm({ ...form, apiProfileId: e.target.value })}
                  >
                    {apiProfiles.length === 0 ? (
                      <option value="">请先在设置中添加 API 配置</option>
                    ) : (
                      apiProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">模型 (可选)</label>
                  <input
                    className="form-input"
                    value={form.model}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    placeholder="留空则使用 API 默认模型"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">温度 (0-2)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) || 0.7 })}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingRole ? '保存修改' : '创建角色'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BotIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
