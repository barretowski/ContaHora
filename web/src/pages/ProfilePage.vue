<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { apiErrorMessage } from '../lib/api';
import { resizeImageToDataUrl } from '../lib/image';

const auth = useAuthStore();

const initials = computed(() =>
  (auth.user?.name ?? '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join(''),
);

// ---- dados (nome + foto) ----
const originalAvatar = auth.user?.avatarUrl ?? null;
const profile = reactive({
  name: auth.user?.name ?? '',
  avatarUrl: (auth.user?.avatarUrl ?? null) as string | null,
});
const fileInput = ref<HTMLInputElement | null>(null);
const savingProfile = ref(false);
const profileMsg = ref('');
const profileErr = ref('');

const avatarChanged = computed(() => profile.avatarUrl !== originalAvatar);
const profileDirty = computed(
  () => profile.name.trim() !== (auth.user?.name ?? '') || avatarChanged.value,
);

function pickPhoto() {
  fileInput.value?.click();
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  profileErr.value = '';
  try {
    profile.avatarUrl = await resizeImageToDataUrl(file, 128);
  } catch (err) {
    profileErr.value = apiErrorMessage(err);
  } finally {
    if (fileInput.value) fileInput.value.value = '';
  }
}

function useGooglePhoto() {
  // a foto do Google já está no user quando a conta é vinculada
  profile.avatarUrl = auth.user?.avatarUrl ?? null;
}

function removePhoto() {
  profile.avatarUrl = null;
}

async function saveProfile() {
  savingProfile.value = true;
  profileMsg.value = '';
  profileErr.value = '';
  try {
    const patch: { name?: string; avatarUrl?: string } = {
      name: profile.name.trim(),
    };
    if (avatarChanged.value) patch.avatarUrl = profile.avatarUrl ?? '';
    await auth.updateProfile(patch);
    profileMsg.value = 'Dados salvos.';
  } catch (e) {
    profileErr.value = apiErrorMessage(e);
  } finally {
    savingProfile.value = false;
  }
}

// ---- senha ----
const hasPassword = computed(() => auth.user?.hasPassword !== false);
const pwd = reactive({ current: '', next: '', confirm: '' });
const savingPwd = ref(false);
const pwdMsg = ref('');
const pwdErr = ref('');
const pwdMismatch = computed(
  () => pwd.confirm.length > 0 && pwd.next !== pwd.confirm,
);

async function savePassword() {
  if (pwdMismatch.value || pwd.next.length < 6) {
    pwdErr.value = 'A nova senha precisa de ao menos 6 caracteres e conferir.';
    return;
  }
  savingPwd.value = true;
  pwdMsg.value = '';
  pwdErr.value = '';
  try {
    await auth.changePassword({
      currentPassword: hasPassword.value ? pwd.current : undefined,
      newPassword: pwd.next,
    });
    pwd.current = pwd.next = pwd.confirm = '';
    pwdMsg.value = hasPassword.value
      ? 'Senha alterada.'
      : 'Senha definida. Agora você também pode entrar com e-mail e senha.';
  } catch (e) {
    pwdErr.value = apiErrorMessage(e);
  } finally {
    savingPwd.value = false;
  }
}
</script>

<template>
  <h2 class="text-h5 mb-4">Meu perfil</h2>

  <v-row>
    <v-col cols="12" md="7">
      <v-card>
        <v-card-title class="text-subtitle-1">Dados</v-card-title>
        <v-card-text>
          <div class="d-flex align-center ga-4 mb-4">
            <v-avatar size="72" color="primary">
              <v-img v-if="profile.avatarUrl" :src="profile.avatarUrl" />
              <span v-else class="text-h6">{{ initials }}</span>
            </v-avatar>
            <div class="d-flex flex-column ga-2">
              <div class="d-flex ga-2">
                <v-btn size="small" variant="tonal" prepend-icon="mdi-camera" @click="pickPhoto">
                  Trocar foto
                </v-btn>
                <v-btn
                  v-if="profile.avatarUrl"
                  size="small"
                  variant="text"
                  color="error"
                  @click="removePhoto"
                >
                  Remover
                </v-btn>
              </div>
              <a
                v-if="auth.user?.googleLinked && auth.user.avatarUrl && profile.avatarUrl !== auth.user.avatarUrl"
                class="text-caption text-primary"
                style="cursor: pointer"
                @click="useGooglePhoto"
              >
                usar minha foto do Google
              </a>
            </div>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="d-none"
              @change="onFile"
            />
          </div>

          <v-text-field
            v-model="profile.name"
            label="Nome"
            prepend-inner-icon="mdi-account-outline"
          />
          <v-text-field
            :model-value="auth.user?.email"
            label="E-mail"
            prepend-inner-icon="mdi-email-outline"
            readonly
            disabled
          />

          <div class="d-flex ga-2 mb-1">
            <v-chip size="small" :color="auth.isAdmin ? 'primary' : undefined" label>
              {{ auth.isAdmin ? 'Administrador' : 'Funcionário' }}
            </v-chip>
            <v-chip v-if="auth.user?.googleLinked" size="small" label prepend-icon="mdi-google">
              Google vinculado
            </v-chip>
          </div>

          <v-alert v-if="profileErr" type="error" density="compact" class="mt-3">
            {{ profileErr }}
          </v-alert>
          <v-alert v-if="profileMsg" type="success" density="compact" class="mt-3">
            {{ profileMsg }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingProfile"
            :disabled="!profileDirty"
            @click="saveProfile"
          >
            Salvar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col cols="12" md="5">
      <v-card>
        <v-card-title class="text-subtitle-1">
          {{ hasPassword ? 'Alterar senha' : 'Definir senha' }}
        </v-card-title>
        <v-card-text>
          <p v-if="!hasPassword" class="text-body-2 text-medium-emphasis mb-3">
            Sua conta entra com o Google. Defina uma senha para também poder
            entrar com e-mail e senha.
          </p>

          <v-text-field
            v-if="hasPassword"
            v-model="pwd.current"
            label="Senha atual"
            type="password"
            autocomplete="current-password"
            prepend-inner-icon="mdi-lock-outline"
          />
          <v-text-field
            v-model="pwd.next"
            label="Nova senha"
            type="password"
            autocomplete="new-password"
            prepend-inner-icon="mdi-lock-reset"
            hint="mínimo 6 caracteres"
          />
          <v-text-field
            v-model="pwd.confirm"
            label="Confirmar nova senha"
            type="password"
            autocomplete="new-password"
            prepend-inner-icon="mdi-lock-check-outline"
            :error="pwdMismatch"
            :error-messages="pwdMismatch ? 'As senhas não conferem' : ''"
          />

          <v-alert v-if="pwdErr" type="error" density="compact" class="mt-2">
            {{ pwdErr }}
          </v-alert>
          <v-alert v-if="pwdMsg" type="success" density="compact" class="mt-2">
            {{ pwdMsg }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            :loading="savingPwd"
            :disabled="!pwd.next || pwdMismatch"
            @click="savePassword"
          >
            {{ hasPassword ? 'Alterar' : 'Definir' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>
