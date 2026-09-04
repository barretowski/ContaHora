<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, RouterView } from 'vue-router';
import { useTheme } from 'vuetify';
import { useAuthStore } from '../stores/auth';
import { saveTheme } from '../lib/theme';

const auth = useAuthStore();
const router = useRouter();
const drawer = ref(true);

const theme = useTheme();
const isDark = computed(() => theme.global.name.value === 'dark');
function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark';
  theme.global.name.value = next;
  saveTheme(next);
}

const nav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: { name: 'dashboard' } },
  { title: 'Lançamentos', icon: 'mdi-table-clock', to: { name: 'entries' } },
  { title: 'Relatório', icon: 'mdi-file-chart-outline', to: { name: 'report' } },
];

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(''),
);

function logout() {
  auth.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <v-navigation-drawer v-model="drawer">
    <v-list-item
      prepend-icon="mdi-clock-check-outline"
      title="ContaHora"
      subtitle="Horas extras"
    />
    <v-divider />
    <v-list nav density="comfortable">
      <v-list-item
        v-for="item in nav"
        :key="item.title"
        :to="item.to"
        :prepend-icon="item.icon"
        :title="item.title"
      />

      <template v-if="auth.isAdmin">
        <v-divider class="my-2" />
        <v-list-subheader>Administração</v-list-subheader>
        <v-list-item
          :to="{ name: 'admin' }"
          prepend-icon="mdi-shield-account"
          title="Admin"
        />
        <v-list-item
          :to="{ name: 'users' }"
          prepend-icon="mdi-account-group"
          title="Funcionários"
        />
      </template>
    </v-list>
  </v-navigation-drawer>

  <v-app-bar flat border>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>ContaHora</v-app-bar-title>
    <template #append>
      <v-btn
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        :title="isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'"
        variant="text"
        @click="toggleTheme"
      />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none px-2">
            <v-avatar size="30" color="primary" class="mr-2">
              <v-img v-if="auth.user?.avatarUrl" :src="auth.user.avatarUrl" />
              <span v-else class="text-caption">{{ initials }}</span>
            </v-avatar>
            <span class="d-none d-sm-inline">{{ auth.user?.name }}</span>
            <v-icon end size="small">mdi-menu-down</v-icon>
          </v-btn>
        </template>
        <v-list density="compact" min-width="200">
          <v-list-item
            :to="{ name: 'profile' }"
            prepend-icon="mdi-account-circle-outline"
            title="Meu perfil"
          />
          <v-divider />
          <v-list-item
            prepend-icon="mdi-logout"
            title="Sair"
            @click="logout"
          />
        </v-list>
      </v-menu>
    </template>
  </v-app-bar>

  <v-main>
    <v-container class="py-6" style="max-width: 1100px">
      <RouterView />
    </v-container>
  </v-main>
</template>
