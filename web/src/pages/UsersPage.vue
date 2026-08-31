<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import type { Role, User } from '../types';

const users = ref<User[]>([]);
const loading = ref(false);
const error = ref('');

const headers = [
  { title: 'Nome', key: 'name' },
  { title: 'E-mail', key: 'email' },
  { title: 'Perfil', key: 'role', width: 120 },
  { title: 'Ativo', key: 'active', width: 90 },
  { title: '', key: 'actions', sortable: false, width: 80, align: 'end' as const },
];

const roleOptions: { title: string; value: Role }[] = [
  { title: 'Funcionário', value: 'USER' },
  { title: 'Administrador', value: 'ADMIN' },
];

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get<User[]>('/users');
    users.value = data;
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}
onMounted(load);

const dialog = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const formError = ref('');
const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'USER' as Role,
  active: true,
});

function openCreate() {
  editingId.value = null;
  Object.assign(form, { name: '', email: '', password: '', role: 'USER', active: true });
  formError.value = '';
  dialog.value = true;
}

function openEdit(u: User) {
  editingId.value = u.id;
  Object.assign(form, {
    name: u.name,
    email: u.email,
    password: '',
    role: u.role,
    active: u.active ?? true,
  });
  formError.value = '';
  dialog.value = true;
}

async function save() {
  saving.value = true;
  formError.value = '';
  try {
    if (editingId.value) {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
      };
      if (form.password) payload.password = form.password;
      await api.patch(`/users/${editingId.value}`, payload);
    } else {
      await api.post('/users', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
    }
    dialog.value = false;
    await load();
  } catch (e) {
    formError.value = apiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="d-flex align-center ga-3 mb-4">
    <h2 class="text-h5 flex-grow-1">Funcionários</h2>
    <v-btn color="primary" prepend-icon="mdi-account-plus" @click="openCreate">
      Novo funcionário
    </v-btn>
  </div>

  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

  <v-card>
    <v-data-table :headers="headers" :items="users" :loading="loading" density="comfortable">
      <template #[`item.role`]="{ item }">
        <v-chip size="small" :color="item.role === 'ADMIN' ? 'primary' : undefined" label>
          {{ item.role === 'ADMIN' ? 'Admin' : 'Funcionário' }}
        </v-chip>
      </template>
      <template #[`item.active`]="{ item }">
        <v-icon :color="item.active ? 'success' : 'error'">
          {{ item.active ? 'mdi-check-circle' : 'mdi-close-circle' }}
        </v-icon>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
      </template>
    </v-data-table>
  </v-card>

  <v-dialog v-model="dialog" max-width="460">
    <v-card>
      <v-card-title>{{ editingId ? 'Editar funcionário' : 'Novo funcionário' }}</v-card-title>
      <v-card-text>
        <v-text-field v-model="form.name" label="Nome" />
        <v-text-field v-model="form.email" label="E-mail" type="email" />
        <v-text-field
          v-model="form.password"
          :label="editingId ? 'Nova senha (deixe vazio p/ manter)' : 'Senha'"
          type="password"
        />
        <v-select v-model="form.role" :items="roleOptions" label="Perfil" />
        <v-switch v-if="editingId" v-model="form.active" label="Ativo" color="primary" />
        <v-alert v-if="formError" type="error" density="compact">{{ formError }}</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" :loading="saving" @click="save">Salvar</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
