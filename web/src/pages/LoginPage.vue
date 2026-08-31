<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiErrorMessage } from '../lib/api';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await auth.login(email.value, password.value);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
    <v-card class="pa-6" width="380" elevation="4">
      <div class="text-center mb-4">
        <v-icon size="40" color="primary">mdi-clock-check-outline</v-icon>
        <h1 class="text-h6 mt-2">ContaHora</h1>
        <p class="text-body-2 text-medium-emphasis">Controle de horas extras</p>
      </div>

      <v-form @submit.prevent="submit">
        <v-text-field
          v-model="email"
          label="E-mail"
          type="email"
          autocomplete="username"
          prepend-inner-icon="mdi-email-outline"
          required
        />
        <v-text-field
          v-model="password"
          label="Senha"
          type="password"
          autocomplete="current-password"
          prepend-inner-icon="mdi-lock-outline"
          required
        />

        <v-alert v-if="error" type="error" density="compact" class="mb-3">
          {{ error }}
        </v-alert>

        <v-btn
          type="submit"
          color="primary"
          block
          size="large"
          :loading="loading"
        >
          Entrar
        </v-btn>
      </v-form>
    </v-card>
  </v-main>
</template>
