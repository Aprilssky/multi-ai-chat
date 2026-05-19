import { useConfigStore } from '../stores/configStore';
import { useRoleStore } from '../stores/roleStore';
import { useChatroomStore } from '../stores/chatroomStore';
import { storageService } from '../services/storageService';
import { MessagesSquare, Bot, Settings, Download, Upload, Trash2 } from 'lucide-react';
import RoleManager from './RoleManager';
import ChatroomManager from './ChatroomManager';
import ChatView from './ChatView';
import SettingsPanel from './SettingsPanel';
import type { ViewType } from '../types';

interface LayoutProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export default function Layout({ currentView, onViewChange }: LayoutProps) {
  const apiProfiles = useConfigStore((s) => s.apiProfiles);
  const roles = useRoleStore((s) => s.roles);
  const chatrooms = useChatroomStore((s) => s.chatrooms);

  const handleExport = () => {
    const data = storageService.exportAll(apiProfiles, roles, chatrooms);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `multi-ai-chat-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = storageService.importAll(data);
        if (!result) {
          alert('导入失败：数据格式无效');
          return;
        }
        useConfigStore.getState().loadFromStorage();
        // Manually set imported profiles
        const { profiles, roles: importedRoles, chatrooms: importedChatrooms } = result;
        const configStore = useConfigStore.getState();
        const roleStore = useRoleStore.getState();
        const chatroomStore = useChatroomStore.getState();

        // Clear and reload
        profiles.forEach((p) => configStore.addProfile(p));
        importedRoles.forEach((r) => roleStore.addRole(r));
        importedChatrooms.forEach((c) => chatroomStore.addChatroom(c.name, c.memberRoleIds));

        alert('导入成功！');
        window.location.reload();
      } catch {
        alert('导入失败：文件格式错误');
      }
    };
    input.click();
  };

  return (
    <div className="app-layout">
      {/* 左侧导航 */}
      <nav className="app-sidebar">
        <div className="sidebar-header">
          <Bot className="icon" size={22} />
          <span>AI 群聊</span>
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${currentView === 'chatrooms' ? 'active' : ''}`}
            onClick={() => onViewChange('chatrooms')}
          >
            <MessagesSquare className="icon" size={18} />
            <span>群聊</span>
          </button>
          <button
            className={`nav-item ${currentView === 'roles' ? 'active' : ''}`}
            onClick={() => onViewChange('roles')}
          >
            <Bot className="icon" size={18} />
            <span>角色</span>
          </button>
          <button
            className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
            onClick={() => onViewChange('settings')}
          >
            <Settings className="icon" size={18} />
            <span>设置</span>
          </button>
        </div>

        <div className="sidebar-footer">
          <button className="btn-export" onClick={handleExport}>
            <Download size={14} />
            导出数据
          </button>
          <button className="btn-export" onClick={handleImport}>
            <Upload size={14} />
            导入数据
          </button>
        </div>
      </nav>

      {/* 主内容区 */}
      <div className="app-main">
        {currentView === 'roles' && <RoleManager />}
        {currentView === 'chatrooms' && <ChatroomManager />}
        {currentView === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
