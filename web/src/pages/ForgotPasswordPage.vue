<script setup lang="ts">
import { ref } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import AuthShell from '../components/AuthShell.vue';

const email = ref('');
const loading = ref(false);
const sent = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    await api.post('/auth/forgot-password', { email: email.value });
    sent.value = true;
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Recuperar senha" subtitle="ContaHora">
    <template v-if="sent">
      <v-alert type="success" density="comfortable" class="mb-4">
        Se existir uma conta com esse e-mail, enviamos as instruções para
        redefinir a senha. O link expira em 1 hora.
      </v-alert>
      <v-btn :to="{ name: 'login' }" color="primary" block variant="tonal">
        Voltar ao login
      </v-btn>
    </template>

    <v-form v-else @submit.prevent="submit">
      <p class="text-body-2 text-medium-emphasis mb-3">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>
      <v-text-field
        v-model="email"
        label="E-mail"
        type="email"
        autocomplete="username"
        prepend-inner-icon="mdi-email-outline"
        required
      />

      <v-alert v-if="error" type="error" density="compact" class="mb-3">
        {{ error }}
      </v-alert>

      <v-btn type="submit" color="primary" block size="large" :loading="loading">
        Enviar link
      </v-btn>

      <div class="text-center text-body-2 mt-4">
        <RouterLink :to="{ name: 'login' }" class="text-primary">Voltar ao login</RouterLink>
      </div>
    </v-form>
  </AuthShell>
</template>
