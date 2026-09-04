import { defineStore } from 'pinia';
import { api, getToken, setToken } from '../lib/api';
import type { User } from '../types';

interface State {
  user: User | null;
  token: string | null;
  ready: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): State => ({
    user: null,
    token: getToken(),
    ready: false,
  }),
  getters: {
    isAuthenticated: (s) => !!s.token && !!s.user,
    isAdmin: (s) => s.user?.role === 'ADMIN',
  },
  actions: {
    setSession(payload: { token: string; user: User }) {
      setToken(payload.token);
      this.token = payload.token;
      this.user = payload.user;
      this.ready = true;
    },
    async login(email: string, password: string) {
      const { data } = await api.post('/auth/login', { email, password });
      this.setSession(data);
    },
    async register(name: string, email: string, password: string) {
      const { data } = await api.post('/auth/register', { name, email, password });
      this.setSession(data);
    },
    async loginWithGoogle(credential: string) {
      const { data } = await api.post('/auth/google', { credential });
      this.setSession(data);
    },
    async updateProfile(patch: { name?: string; avatarUrl?: string }) {
      const { data } = await api.patch('/auth/me', patch);
      this.user = data;
    },
    async changePassword(payload: {
      currentPassword?: string;
      newPassword: string;
    }) {
      await api.post('/auth/me/password', payload);
      if (this.user) this.user.hasPassword = true;
    },
    async fetchMe() {
      if (!this.token) {
        this.ready = true;
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        this.user = data;
      } catch {
        this.logout();
      } finally {
        this.ready = true;
      }
    },
    logout() {
      setToken(null);
      this.token = null;
      this.user = null;
    },
  },
});
