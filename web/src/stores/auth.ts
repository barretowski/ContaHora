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
    async login(email: string, password: string) {
      const { data } = await api.post('/auth/login', { email, password });
      setToken(data.token);
      this.token = data.token;
      this.user = data.user;
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
