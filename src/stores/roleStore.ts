import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Role } from '../types';
import { storageService } from '../services/storageService';

interface RoleState {
  roles: Role[];

  loadFromStorage: () => void;
  addRole: (role: Omit<Role, 'id'>) => string;
  updateRole: (id: string, data: Partial<Role>) => void;
  removeRole: (id: string) => void;
  getRole: (id: string) => Role | undefined;
  getAllRoles: () => Role[];
}

export const useRoleStore = create<RoleState>((set, get) => ({
  roles: [],

  loadFromStorage: () => {
    set({ roles: storageService.loadRoles() });
  },

  addRole: (role) => {
    const id = uuidv4();
    const newRole: Role = { ...role, id };
    set((state) => {
      const updated = [...state.roles, newRole];
      storageService.saveRoles(updated);
      return { roles: updated };
    });
    return id;
  },

  updateRole: (id, data) => {
    set((state) => {
      const updated = state.roles.map((r) =>
        r.id === id ? { ...r, ...data } : r
      );
      storageService.saveRoles(updated);
      return { roles: updated };
    });
  },

  removeRole: (id) => {
    set((state) => {
      const updated = state.roles.filter((r) => r.id !== id);
      storageService.saveRoles(updated);
      return { roles: updated };
    });
  },

  getRole: (id) => get().roles.find((r) => r.id === id),
  getAllRoles: () => get().roles,
}));
