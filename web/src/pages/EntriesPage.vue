<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import {
  currentMonthKey,
  shiftMonth,
  monthLabel,
  isoToBr,
} from '../lib/month';
import { minutesToLabel } from '../lib/time';
import {
  STATUS_LABEL,
  STATUS_COLOR,
  type EntryStatus,
  type OvertimeEntry,
  type User,
} from '../types';

const auth = useAuthStore();

const month = ref(currentMonthKey());
const entries = ref<OvertimeEntry[]>([]);
const loading = ref(false);
const error = ref('');

// admin: escolher funcionário
const users = ref<User[]>([]);
const selectedUserId = ref<string>('');

const statusOptions = (Object.keys(STATUS_LABEL) as EntryStatus[]).map((v) => ({
  title: STATUS_LABEL[v],
  value: v,
}));

const DAY_MINUTES = 24 * 60;
const presets = [15, 30, 45, 60, 90, 120, 180, 240];

const headers = [
  { title: 'Data', key: 'date', width: 120 },
  { title: 'Duração', key: 'minutes', width: 110 },
  { title: 'Descrição', key: 'description' },
  { title: 'Status', key: 'status', width: 150 },
  { title: '', key: 'actions', sortable: false, width: 100, align: 'end' as const },
];

const totalMinutes = computed(() =>
  entries.value.reduce((sum, e) => sum + e.minutes, 0),
);

async function loadUsers() {
  if (!auth.isAdmin) return;
  const { data } = await api.get<User[]>('/users');
  users.value = data;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const params: Record<string, string> = { month: month.value };
    if (auth.isAdmin && selectedUserId.value) params.userId = selectedUserId.value;
    const { data } = await api.get<OvertimeEntry[]>('/entries', { params });
    entries.value = data;
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadUsers();
  await load();
});
watch([month, selectedUserId], load);

// ---- dialog de criar/editar ----
const dialog = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  date: new Date().toISOString().slice(0, 10),
  hours: 0,
  mins: 0,
  description: '',
  status: 'PENDENTE' as EntryStatus,
});
const formError = ref('');

const durationMinutes = computed(() => {
  const h = Number.isFinite(+form.hours) ? Math.max(0, Math.floor(+form.hours)) : 0;
  const m = Number.isFinite(+form.mins) ? Math.max(0, Math.floor(+form.mins)) : 0;
  return Math.min(h * 60 + m, DAY_MINUTES);
});
const durationLabel = computed(() =>
  durationMinutes.value > 0 ? minutesToLabel(durationMinutes.value) : '0min',
);

/** normaliza: carrega minutos >= 60 para horas e mantém tudo formatado */
function normalizeDuration() {
  const total = durationMinutes.value;
  form.hours = Math.floor(total / 60);
  form.mins = total % 60;
}

function setPreset(min: number) {
  form.hours = Math.floor(min / 60);
  form.mins = min % 60;
}

function setDuration(totalMin: number) {
  const clamped = Math.max(0, Math.min(totalMin, DAY_MINUTES));
  form.hours = Math.floor(clamped / 60);
  form.mins = clamped % 60;
}

function openCreate() {
  editingId.value = null;
  form.date = new Date().toISOString().slice(0, 10);
  setDuration(0);
  form.description = '';
  form.status = 'PENDENTE';
  formError.value = '';
  dialog.value = true;
}

function openEdit(e: OvertimeEntry) {
  editingId.value = e.id;
  form.date = e.date.slice(0, 10);
  setDuration(e.minutes);
  form.description = e.description ?? '';
  form.status = e.status;
  formError.value = '';
  dialog.value = true;
}

async function save() {
  normalizeDuration();
  if (durationMinutes.value < 1) {
    formError.value = 'Informe a duração (horas e/ou minutos).';
    return;
  }
  saving.value = true;
  formError.value = '';
  try {
    const payload = {
      date: form.date,
      minutes: durationMinutes.value,
      description: form.description || undefined,
      status: form.status,
    };
    if (editingId.value) {
      await api.patch(`/entries/${editingId.value}`, payload);
    } else {
      await api.post('/entries', payload);
    }
    dialog.value = false;
    await load();
  } catch (e) {
    formError.value = apiErrorMessage(e);
  } finally {
    saving.value = false;
  }
}

// ---- excluir ----
const confirmDelete = ref<OvertimeEntry | null>(null);
async function doDelete() {
  if (!confirmDelete.value) return;
  try {
    await api.delete(`/entries/${confirmDelete.value.id}`);
    confirmDelete.value = null;
    await load();
  } catch (e) {
    error.value = apiErrorMessage(e);
  }
}

async function quickStatus(e: OvertimeEntry, status: EntryStatus) {
  try {
    await api.patch(`/entries/${e.id}`, { status });
    e.status = status;
  } catch (err) {
    error.value = apiErrorMessage(err);
  }
}
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-3 mb-4">
    <h2 class="text-h5 flex-grow-1">Lançamentos</h2>
    <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">
      Novo lançamento
    </v-btn>
  </div>

  <v-card class="mb-4">
    <v-card-text class="d-flex flex-wrap align-center ga-3">
      <v-btn icon="mdi-chevron-left" variant="text" @click="month = shiftMonth(month, -1)" />
      <span class="text-subtitle-1 text-capitalize" style="min-width: 160px; text-align: center">
        {{ monthLabel(month) }}
      </span>
      <v-btn icon="mdi-chevron-right" variant="text" @click="month = shiftMonth(month, 1)" />

      <v-select
        v-if="auth.isAdmin"
        v-model="selectedUserId"
        :items="[{ title: 'Eu', value: '' }, ...users.map((u) => ({ title: u.name, value: u.id }))]"
        label="Funcionário"
        density="compact"
        hide-details
        style="max-width: 220px"
      />

      <v-spacer />
      <v-chip color="primary" variant="tonal" size="large">
        Total: {{ minutesToLabel(totalMinutes) }}
      </v-chip>
    </v-card-text>
  </v-card>

  <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
    {{ error }}
  </v-alert>

  <v-card>
    <v-data-table
      :headers="headers"
      :items="entries"
      :loading="loading"
      density="comfortable"
      no-data-text="Nenhum lançamento neste mês"
      :items-per-page="-1"
    >
      <template #[`item.date`]="{ item }">{{ isoToBr(item.date) }}</template>
      <template #[`item.minutes`]="{ item }">
        <span class="font-weight-medium">{{ minutesToLabel(item.minutes) }}</span>
      </template>
      <template #[`item.description`]="{ item }">
        <span class="text-medium-emphasis">{{ item.description || '—' }}</span>
      </template>
      <template #[`item.status`]="{ item }">
        <v-menu>
          <template #activator="{ props }">
            <v-chip
              v-bind="props"
              :color="STATUS_COLOR[item.status as EntryStatus]"
              size="small"
              label
            >
              {{ STATUS_LABEL[item.status as EntryStatus] }}
              <v-icon end size="x-small">mdi-menu-down</v-icon>
            </v-chip>
          </template>
          <v-list density="compact">
            <v-list-item
              v-for="opt in statusOptions"
              :key="opt.value"
              :title="opt.title"
              @click="quickStatus(item, opt.value)"
            />
          </v-list>
        </v-menu>
      </template>
      <template #[`item.actions`]="{ item }">
        <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEdit(item)" />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          @click="confirmDelete = item"
        />
      </template>
    </v-data-table>
  </v-card>

  <!-- dialog criar/editar -->
  <v-dialog v-model="dialog" max-width="520" scrollable>
    <v-card>
      <v-card-title class="d-flex align-center ga-2 py-4">
        <v-icon :icon="editingId ? 'mdi-pencil' : 'mdi-plus-circle'" color="primary" />
        {{ editingId ? 'Editar lançamento' : 'Novo lançamento' }}
      </v-card-title>
      <v-divider />

      <v-card-text>
        <v-form @submit.prevent="save">
          <v-text-field
            v-model="form.date"
            label="Data"
            type="date"
            prepend-inner-icon="mdi-calendar"
          />

          <div class="text-body-2 font-weight-medium mb-2">Duração</div>
          <div class="d-flex ga-3">
            <v-text-field
              v-model.number="form.hours"
              type="number"
              min="0"
              max="24"
              inputmode="numeric"
              label="Horas"
              suffix="h"
              @blur="normalizeDuration"
            />
            <v-text-field
              v-model.number="form.mins"
              type="number"
              min="0"
              max="59"
              step="5"
              inputmode="numeric"
              label="Minutos"
              suffix="min"
              @blur="normalizeDuration"
            />
          </div>

          <div class="d-flex flex-wrap ga-2 mb-3">
            <v-chip
              v-for="p in presets"
              :key="p"
              size="small"
              variant="outlined"
              :color="durationMinutes === p ? 'primary' : undefined"
              @click="setPreset(p)"
            >
              {{ minutesToLabel(p) }}
            </v-chip>
          </div>

          <div class="duration-preview mb-4">
            <v-icon color="primary" size="small">mdi-timer-outline</v-icon>
            <span class="text-h6">{{ durationLabel }}</span>
            <span class="text-body-2 text-medium-emphasis">
              {{ durationMinutes }} minuto{{ durationMinutes === 1 ? '' : 's' }}
            </span>
          </div>

          <v-textarea
            v-model="form.description"
            label="Descrição (opcional)"
            rows="2"
            auto-grow
            variant="outlined"
            prepend-inner-icon="mdi-text"
          />

          <div class="text-body-2 font-weight-medium mb-2">Status</div>
          <v-btn-toggle
            v-model="form.status"
            mandatory
            divided
            variant="outlined"
            class="d-flex mb-2"
          >
            <v-btn
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
              size="small"
              class="flex-grow-1 text-caption"
            >
              {{ opt.title }}
            </v-btn>
          </v-btn-toggle>

          <v-alert v-if="formError" type="error" density="compact" class="mt-2">
            {{ formError }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider />
      <v-card-actions class="py-3">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">Cancelar</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">
          Salvar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- confirmar exclusão -->
  <v-dialog :model-value="!!confirmDelete" max-width="400" @update:model-value="confirmDelete = null">
    <v-card>
      <v-card-title>Excluir lançamento?</v-card-title>
      <v-card-text>
        {{ confirmDelete && isoToBr(confirmDelete.date) }} —
        {{ confirmDelete && minutesToLabel(confirmDelete.minutes) }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="confirmDelete = null">Cancelar</v-btn>
        <v-btn color="error" @click="doDelete">Excluir</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.duration-preview {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.08);
}
.duration-preview .v-icon {
  align-self: center;
}
</style>
