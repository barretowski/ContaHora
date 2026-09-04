<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, apiErrorMessage } from '../lib/api';
import AuthShell from '../components/AuthShell.vue';

const route = useRoute();
const router = useRouter();

const token = (route.query.token as string) || '';
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const done = ref(false);
const error = ref('');

const mismatch = computed(
  () => confirm.value.length > 0 && password.value !== confirm.value,
);

async function submit() {
  if (mismatch.value || !token) return;
  loading.value = true;
  error.value = '';
  try {
    await api.post('/auth/reset-password', { token, password: password.value });
    done.value = true;
    setTimeout(() => router.push({ name: 'login' }), 1800);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Nova senha" subtitle="ContaHora">
    <v-alert v-if="!token" type="error" density="comfortable">
      Link inválido. Solicite um novo em
      <RouterLink :to="{ name: 'forgot-password' }" class="text-primary">Recuperar senha</RouterLink>.
    </v-alert>

    <v-alert v-else-if="done" type="success" density="comfortable">
      Senha alterada! Redirecionando para o login…
    </v-alert>

    <v-form v-else @submit.prevent="submit">
      <v-text-field
        v-model="password"
        label="Nova senha"
        type="password"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-outline"
        hint="mínimo 6 caracteres"
        required
      />
      <v-text-field
        v-model="confirm"
        label="Confirmar senha"
        type="password"
        autocomplete="new-password"
        prepend-inner-icon="mdi-lock-check-outline"
        :error="mismatch"
        :error-messages="mismatch ? 'As senhas não conferem' : ''"
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
        :disabled="mismatch"
      >
        Salvar nova senha
      </v-btn>
    </v-form>
  </AuthShell>
</template>
