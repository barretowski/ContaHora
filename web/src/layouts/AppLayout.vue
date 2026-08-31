<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, RouterView } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const drawer = ref(true);

const nav = [
  { title: 'Dashboard', icon: 'mdi-view-dashboard', to: { name: 'dashboard' } },
  { title: 'Lançamentos', icon: 'mdi-table-clock', to: { name: 'entries' } },
];

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
      <v-list-item
        v-if="auth.isAdmin"
        :to="{ name: 'users' }"
        prepend-icon="mdi-account-group"
        title="Funcionários"
      />
    </v-list>
  </v-navigation-drawer>

  <v-app-bar flat border>
    <v-app-bar-nav-icon @click="drawer = !drawer" />
    <v-app-bar-title>ContaHora</v-app-bar-title>
    <template #append>
      <span class="text-body-2 mr-3 d-none d-sm-inline">{{ auth.user?.name }}</span>
      <v-btn icon="mdi-logout" variant="text" @click="logout" />
    </template>
  </v-app-bar>

  <v-main>
    <v-container class="py-6" style="max-width: 1100px">
      <RouterView />
    </v-container>
  </v-main>
</template>
