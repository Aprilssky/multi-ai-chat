import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import { useConfigStore } from './stores/configStore';
import { useRoleStore } from './stores/roleStore';
import { useChatroomStore } from './stores/chatroomStore';
import type { ViewType } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('chatrooms');
  const loadConfig = useConfigStore((s) => s.loadFromStorage);
  const loadRoles = useRoleStore((s) => s.loadFromStorage);
  const loadChatrooms = useChatroomStore((s) => s.loadFromStorage);

  useEffect(() => {
    loadConfig();
    loadRoles();
    loadChatrooms();
  }, []);

  return <Layout currentView={currentView} onViewChange={setCurrentView} />;
}
