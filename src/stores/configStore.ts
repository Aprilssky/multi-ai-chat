import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { ApiProfile } from '../types';
import { storageService } from '../services/storageService';

interface ConfigState {
  apiProfiles: ApiProfile[];
  selectedProfileId: string | null;

  loadFromStorage: () => void;
  addProfile: (profile: Omit<ApiProfile, 'id'>) => void;
  updateProfile: (id: string, data: Partial<ApiProfile>) => void;
  removeProfile: (id: string) => void;
  selectProfile: (id: string) => void;
  getProfile: (id: string) => ApiProfile | undefined;
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  apiProfiles: [],
  selectedProfileId: null,

  loadFromStorage: () => {
    const profiles = storageService.loadApiProfiles();
    set({
      apiProfiles: profiles,
      selectedProfileId: profiles.length > 0 ? profiles[0].id : null,
    });
  },

  addProfile: (profile) => {
    const newProfile: ApiProfile = { ...profile, id: uuidv4() };
    set((state) => {
      const updated = [...state.apiProfiles, newProfile];
      storageService.saveApiProfiles(updated);
      return {
        apiProfiles: updated,
        selectedProfileId: state.selectedProfileId || newProfile.id,
      };
    });
  },

  updateProfile: (id, data) => {
    set((state) => {
      const updated = state.apiProfiles.map((p) =>
        p.id === id ? { ...p, ...data } : p
      );
      storageService.saveApiProfiles(updated);
      return { apiProfiles: updated };
    });
  },

  removeProfile: (id) => {
    set((state) => {
      const updated = state.apiProfiles.filter((p) => p.id !== id);
      storageService.saveApiProfiles(updated);
      return {
        apiProfiles: updated,
        selectedProfileId:
          state.selectedProfileId === id
            ? updated.length > 0
              ? updated[0].id
              : null
            : state.selectedProfileId,
      };
    });
  },

  selectProfile: (id) => set({ selectedProfileId: id }),

  getProfile: (id) => get().apiProfiles.find((p) => p.id === id),
}));
