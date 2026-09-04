<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { apiErrorMessage } from '../lib/api';
import AuthShell from '../components/AuthShell.vue';
import GoogleSignInButton from '../components/GoogleSignInButton.vue';

const auth = useAuthStore();
const router = useRouter();

const name = ref('');
const email = ref('');
const password = ref('');
const confirm = ref('');
const loading = ref(false);
const error = ref('');

const mismatch = computed(
  () => confirm.value.length > 0 && password.value !== confirm.value,
);

async function submit() {
  if (mismatch.value) return;
  loading.value = true;
  error.value = '';
  try {
    await auth.register(name.value, email.value, password.value);
    router.push('/');
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

async function onGoogle(credential: string) {
  loading.value = true;
  error.value = '';
  try {
    await auth.loginWithGoogle(credential);
    router.push('/');
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <AuthShell title="Criar uma conta" subtitle="ContaHora">
    <v-form @submit.prevent="submit">
      <v-text-field v-model="name" label="Nome" prepend-inner-icon="mdi-account-outline" required />
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
        Criar conta
      </v-btn>
    </v-form>

    <GoogleSignInButton class="mt-3" @credential="onGoogle" />

    <v-divider class="my-4" />
    <div class="text-center text-body-2">
      Já tem conta?
      <RouterLink :to="{ name: 'login' }" class="text-primary">Entrar</RouterLink>
    </div>
  </AuthShell>
</template>
