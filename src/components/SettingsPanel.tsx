import { useState } from 'react';
import { useConfigStore } from '../stores/configStore';
import { Eye, EyeOff, Plus, Pencil, Trash2, Key, Globe } from 'lucide-react';
import type { ApiProfile } from '../types';

const PRESET_ENDPOINTS = [
  { name: 'OpenAI', endpoint: 'https://api.openai.com/v1', model: 'gpt-4o' },
  { name: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: 'Gemini (OpenAI 兼容)', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
  { name: '自定义', endpoint: '', model: '' },
];

export default function SettingsPanel() {
  const apiProfiles = useConfigStore((s) => s.apiProfiles);
  const addProfile = useConfigStore((s) => s.addProfile);
  const updateProfile = useConfigStore((s) => s.updateProfile);
  const removeProfile = useConfigStore((s) => s.removeProfile);

  const [showModal, setShowModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ApiProfile | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    name: '',
    endpoint: '',
    defaultModel: '',
    apiKey: '',
  });

  const openCreate = () => {
    setEditingProfile(null);
    setForm({ name: '', endpoint: '', defaultModel: '', apiKey: '' });
    setShowModal(true);
  };

  const openEdit = (profile: ApiProfile) => {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      endpoint: profile.endpoint,
      defaultModel: profile.defaultModel,
      apiKey: '',
    });
    setShowModal(true);
  };

  const applyPreset = (presetName: string) => {
    const preset = PRESET_ENDPOINTS.find((p) => p.name === presetName);
    if (preset) {
      setForm({
        ...form,
        name: presetName === '自定义' ? '' : presetName,
        endpoint: preset.endpoint,
        defaultModel: preset.model,
      });
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      alert('请输入配置名称');
      return;
    }
    if (!form.endpoint.trim()) {
      alert('请输入 API Endpoint');
      return;
    }
    if (!form.defaultModel.trim()) {
      alert('请输入默认模型');
      return;
    }

    if (editingProfile) {
      const updateData: Partial<ApiProfile> = {
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        defaultModel: form.defaultModel.trim(),
      };
      if (form.apiKey.trim()) {
        updateData.apiKey = form.apiKey.trim();
      }
      updateProfile(editingProfile.id, updateData);
    } else {
      if (!form.apiKey.trim()) {
        alert('请输入 API Key');
        return;
      }
      addProfile({
        name: form.name.trim(),
        endpoint: form.endpoint.trim(),
        defaultModel: form.defaultModel.trim(),
        apiKey: form.apiKey.trim(),
      });
    }
    setShowModal(false);
  };

  const toggleKeyVisibility = (id: string) => {
    setShowKey((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-title">设置</div>
      <div className="page-subtitle">管理 API 密钥和全局配置</div>

      <div className="page-content">
        <div className="settings-section">
          <div className="settings-section-title">
            <Key size={18} />
            API 配置
          </div>

          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} />
              添加 API 配置
            </button>
          </div>

          {apiProfiles.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <GlobeIcon />
              <h3>还没有 API 配置</h3>
              <p>添加 API 配置后才能创建 AI 角色并开始对话</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                支持 OpenAI、DeepSeek、Gemini 等任何 OpenAI 兼容 API
              </p>
            </div>
          ) : (
            apiProfiles.map((profile) => (
              <div key={profile.id} className="api-profile-card">
                <div className="api-profile-header">
                  <div className="api-profile-name">{profile.name}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => openEdit(profile)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--error)' }}
                      onClick={() => {
                        if (confirm(`确定删除配置「${profile.name}」？`)) {
                          removeProfile(profile.id);
                        }
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="api-profile-details">
                  <span>Endpoint: {profile.endpoint}</span>
                  <span>默认模型: {profile.defaultModel}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    API Key: {showKey[profile.id] ? profile.apiKey : '••••••' + profile.apiKey.slice(-4)}
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: 2 }}
                      onClick={() => toggleKeyVisibility(profile.id)}
                    >
                      {showKey[profile.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <Globe size={18} />
            安全提示
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <p>🔒 所有 API Key 仅存储在本地浏览器中（localStorage），使用 AES 加密。</p>
            <p>🌐 前端直接调用 AI API，数据不经过任何中间服务器。</p>
            <p>💡 建议在 OpenAI/DeepSeek 后台为 Key 设置月度使用限额。</p>
          </div>
        </div>
      </div>

      {/* 编辑/创建 Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                {editingProfile ? '编辑 API 配置' : '添加 API 配置'}
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">快速预设</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {PRESET_ENDPOINTS.map((preset) => (
                    <button
                      key={preset.name}
                      className="btn btn-ghost btn-sm"
                      onClick={() => applyPreset(preset.name)}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">配置名称</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：我的 OpenAI"
                />
              </div>

              <div className="form-group">
                <label className="form-label">API Endpoint</label>
                <input
                  className="form-input"
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <div className="form-hint">必须是 OpenAI Chat Completions 兼容的端点</div>
              </div>

              <div className="form-group">
                <label className="form-label">默认模型</label>
                <input
                  className="form-input"
                  value={form.defaultModel}
                  onChange={(e) => setForm({ ...form, defaultModel: e.target.value })}
                  placeholder="gpt-4o"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  API Key
                  {editingProfile && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 11, marginLeft: 8 }}>(留空则不修改)</span>}
                </label>
                <input
                  className="form-input"
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder={editingProfile ? '输入新 Key 或留空保持不变' : 'sk-...'}
                />
                <div className="form-hint">Key 使用 AES 加密后存储，仅保存在本地浏览器</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editingProfile ? '保存修改' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
