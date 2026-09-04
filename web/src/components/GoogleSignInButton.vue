<script setup lang="ts">
import { onMounted, ref } from 'vue';

const emit = defineEmits<{ (e: 'credential', value: string): void }>();

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const enabled = clientId.length > 0;
const target = ref<HTMLElement | null>(null);

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Falha ao carregar o Google Sign-In'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

onMounted(async () => {
  if (!enabled || !target.value) return;
  try {
    await loadGis();
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (resp: { credential?: string }) => {
        if (resp.credential) emit('credential', resp.credential);
      },
    });
    window.google.accounts.id.renderButton(target.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'center',
      width: 320,
      locale: 'pt-BR',
    });
  } catch {
    /* silencioso: se falhar, o botão simplesmente não aparece */
  }
});
</script>

<template>
  <div v-if="enabled" class="d-flex justify-center">
    <div ref="target" />
  </div>
</template>
