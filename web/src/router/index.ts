import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../pages/LoginPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/registrar',
      name: 'register',
      component: () => import('../pages/RegisterPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/recuperar-senha',
      name: 'forgot-password',
      component: () => import('../pages/ForgotPasswordPage.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/redefinir-senha',
      name: 'reset-password',
      component: () => import('../pages/ResetPasswordPage.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('../pages/DashboardPage.vue'),
        },
        {
          path: 'lancamentos',
          name: 'entries',
          component: () => import('../pages/EntriesPage.vue'),
        },
        {
          path: 'relatorio',
          name: 'report',
          component: () => import('../pages/ReportPage.vue'),
        },
        {
          path: 'perfil',
          name: 'profile',
          component: () => import('../pages/ProfilePage.vue'),
        },
        {
          path: 'admin',
          name: 'admin',
          component: () => import('../pages/AdminPage.vue'),
          meta: { adminOnly: true },
        },
        {
          path: 'usuarios',
          name: 'users',
          component: () => import('../pages/UsersPage.vue'),
          meta: { adminOnly: true },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (!auth.ready) await auth.fetchMe();

  if (to.meta.public) return true;

  if (to.meta.guestOnly) {
    return auth.isAuthenticated ? { name: 'dashboard' } : true;
  }
  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly && !auth.isAdmin) {
    return { name: 'dashboard' };
  }
  return true;
});

export default router;
