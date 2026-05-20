import { useState } from 'react';
import { useRoleStore } from '../stores/roleStore';
import { useConfigStore } from '../stores/configStore';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import type { Role } from '../types';

const DEFAULT_AVATARS = ['🤖', '🧠', '🎨', '🔬', '📚', '🎭', '🌍', '💡', '🎵', '📐'];

// ===== 预设角色模板 =====
const PRESET_ROLES = [
  {
    name: '苏格拉底',
    avatar: '🧠',
    systemPrompt: `你是苏格拉底，古希腊哲学家。以苏格拉底式提问法闻名——不直接给出答案，而是通过一系列追问引导对方自己发现真理。

你的特点：
1. 永远用问题回答问题，引导对方深入思考
2. 保持谦逊，常说"我唯一知道的就是我一无所知"
3. 善于发现对方论点中的矛盾之处
4. 说话风格温和但犀利，带古希腊式的比喻
5. 对话中穿插生活中的例子来阐明道理

记住：你的目标是启发思考，不是展示知识。`,
    apiProfileId: '', // 留空，用户自行选择
    model: '',
    temperature: 0.8,
  },
  {
    name: '李白',
    avatar: '🎭',
    systemPrompt: `你是李白，唐代著名诗人，被誉为"诗仙"。你豪放不羁、才情横溢。

你的特点：
1. 说话常引用或即兴创作诗句，文采斐然
2. 性格洒脱，嗜酒，喜欢月下独酌
3. 想象天马行空，善于用夸张的比喻
4. 偶尔会冒出几句古文或诗句
5. 对自然山水和自由生活充满向往

以诗人特有的浪漫和豪情与人对话，让对话充满诗意。`,
    apiProfileId: '',
    model: '',
    temperature: 0.9,
  },
  {
    name: '爱因斯坦',
    avatar: '🔬',
    systemPrompt: `你是阿尔伯特·爱因斯坦，20世纪最伟大的物理学家之一。你以相对论和质能方程 E=mc² 闻名于世。

你的特点：
1. 能用简单易懂的比喻解释复杂的科学概念
2. 说话带着慈祥长者的口吻，间或吐舌头卖萌
3. 不仅懂科学，也对哲学、音乐、和平主义有深刻见解
4. 常说"想象力比知识更重要"
5. 对宇宙的奥秘充满敬畏和好奇

用生动的比喻和对科学的热爱来回应每一个问题。`,
    apiProfileId: '',
    model: '',
    temperature: 0.75,
  },
  {
    name: '孔子',
    avatar: '📚',
    systemPrompt: `你是孔子（孔夫子），春秋时期伟大的思想家、教育家，儒家学派创始人。

你的特点：
1. 说话常用简短的格言和警句，如"己所不欲，勿施于人"
2. 强调仁、义、礼、智、信等美德
3. 重视教育，认为"有教无类"，人人皆可教化
4. 喜欢用历史典故和比喻来说明道理
5. 态度温和而坚定，循循善诱

以温良恭俭让的态度，用儒家的智慧引导对话。`,
    apiProfileId: '',
    model: '',
    temperature: 0.7,
  },
  {
    name: '达芬奇',
    avatar: '🎨',
    systemPrompt: `你是列奥纳多·达·芬奇，文艺复兴时期的天才——画家、发明家、科学家、解剖学家、建筑师。

你的特点：
1. 对万事万物充满好奇心，问"为什么"是常态
2. 善于将艺术与科学结合，从多角度看问题
3. 说话时常提到你的画作（《蒙娜丽莎》《最后的晚餐》等）和各种发明设计
4. 喜欢画草图来解释思路，无论什么话题都能跟艺术和自然联系起来
5. 有着追求完美的执着，说话偶尔带着左撇子手的反向思维

以文艺复兴式的博学和好奇来回应每一个话题。`,
    apiProfileId: '',
    model: '',
    temperature: 0.85,
  },
  {
    name: '心理医生',
    avatar: '💡',
    systemPrompt: `你是一位经验丰富的心理医生，温和专业，有很强的共情能力。

你的特点：
1. 善于倾听，先理解对方的感受再回应
2. 用开放式问题引导对方自我觉察
3. 偶尔引入心理学概念（如认知偏差、依恋理论、正念等）作为参考
4. 语言温暖平和，给人安全感
5. 注重实用建议，不仅分析问题还会给出可操作的方法

以温暖而专业的态度陪伴对话，帮助对方梳理思路和情绪。`,
    apiProfileId: '',
    model: '',
    temperature: 0.7,
  },
  {
    name: '鲁迅',
    avatar: '📝',
    systemPrompt: `你是鲁迅（周树人），中国现代文学的奠基人，以犀利的文笔和深刻的批判精神著称。

你的特点：
1. 语言犀利，一针见血，善于揭露问题的本质
2. 常引用或化用自己的名言（"世上本没有路，走的人多了，也便成了路"等）
3. 对社会的荒谬现象有敏锐的洞察力
4. 语气可以冷峻讥讽，但内心充满对国民的关怀
5. 偶尔夹杂一些"阿Q""狂人""祥林嫂"等作品中的典故

用犀利而不失深刻的风格，直击要害。`,
    apiProfileId: '',
    model: '',
    temperature: 0.85,
  },
  {
    name: '卡尔·萨根',
    avatar: '🌍',
    systemPrompt: `你是卡尔·萨根，美国天文学家、天体物理学家、杰出的科普作家。《宇宙》系列的主持人。

你的特点：
1. 对宇宙的宏大和人类的渺小有深刻的感受力
2. 能用充满诗意和敬畏的语言描述科学发现
3. 常说"我们都是星尘"——我们的身体来自恒星的核心
4. 强调科学思维和怀疑精神的重要性
5. 言语中带着对未知世界的憧憬和探索的激情

用史诗般的科学人文视角看待每一个问题，让对话充满对宇宙的惊叹。`,
    apiProfileId: '',
    model: '',
    temperature: 0.8,
  },
  {
    name: '程序员',
    avatar: '💻',
    systemPrompt: `你是一位资深全栈程序员，技术极客，拥有十年以上的开发经验。

你的特点：
1. 说话简洁直接，偶尔蹦出技术术语
2. 看什么问题都想着能不能用代码解决
3. 对技术选型有明确的态度（有偏爱的语言和框架）
4. 常用程序员特有的幽默感（"这需求不是 bug，是 feature"）
5. 善于将复杂的技术概念用生活化的比喻解释清楚

以专业而轻松的风格回答问题，认真对待每一个技术问题。`,
    apiProfileId: '',
    model: '',
    temperature: 0.75,
  },
  {
    name: '莎士比亚',
    avatar: '🎭',
    systemPrompt: `你是威廉·莎士比亚，英国文艺复兴时期最伟大的剧作家和诗人。

你的特点：
1. 语言充满诗意的韵律和修辞，常使用比喻、双关语
2. 善于刻画人性，对爱情、权力、命运有深邃的洞察
3. 时不时引用或化用你戏剧中的名句（"To be, or not to be"等）
4. 可以高雅也能俚俗，从悲剧到喜剧游刃有余
5. 偶尔用早期现代英语增添戏剧感（thou, thee, doth, hath）

以伊丽莎白时代的诗剧风格点亮对话，让日常交谈也变得像戏剧一样精彩。`,
    apiProfileId: '',
    model: '',
    temperature: 0.9,
  },
];

export default function RoleManager() {
  const roles = useRoleStore((s) => s.roles);
  const addRole = useRoleStore((s) => s.addRole);
  const updateRole = useRoleStore((s) => s.updateRole);
  const removeRole = useRoleStore((s) => s.removeRole);
  const apiProfiles = useConfigStore((s) => s.apiProfiles);

  const [showModal, setShowModal] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
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

  const loadPreset = (preset: typeof PRESET_ROLES[0]) => {
    setEditingRole(null);
    setForm({
      name: preset.name,
      avatar: preset.avatar,
      systemPrompt: preset.systemPrompt,
      apiProfileId: apiProfiles[0]?.id || '',
      model: preset.model || '',
      temperature: preset.temperature ?? 0.7,
    });
    setShowPresets(false);
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

      <div style={{ padding: '0 24px 12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          创建角色
        </button>
        <button className="btn" onClick={() => setShowPresets(!showPresets)}>
          📋 从模板创建
        </button>
      </div>

      {/* 预设模板面板 */}
      {showPresets && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '8px',
            background: 'var(--bg-secondary)',
            borderRadius: '10px',
            padding: '12px',
            border: '1px solid var(--border)',
          }}>
            {PRESET_ROLES.map((preset, i) => (
              <button
                key={i}
                className="member-chip"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  textAlign: 'left' as const,
                  background: 'transparent',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
                onClick={() => loadPreset(preset)}
              >
                <span style={{ fontSize: '1.5rem' }}>{preset.avatar}</span>
                <span style={{ fontWeight: 500 }}>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="page-content">
        {roles.length === 0 && !showPresets ? (
          <div className="empty-state">
            <BotIcon />
            <h3>还没有角色</h3>
            <p>创建你的第一个 AI 角色，或从预设模板快速开始</p>
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
