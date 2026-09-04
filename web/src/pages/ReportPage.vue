<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import { useAuthStore } from '../stores/auth';
import { currentMonthKey, shiftMonth, monthLabel } from '../lib/month';
import { minutesToLabel } from '../lib/time';
import {
  buildTxt,
  buildMessage,
  computeTotals,
  downloadText,
  type ReportData,
} from '../lib/report';
import { downloadPdf } from '../lib/pdf';
import type { OvertimeEntry, User } from '../types';

const auth = useAuthStore();

const month = ref(currentMonthKey());
const entries = ref<OvertimeEntry[]>([]);
const loading = ref(false);
const error = ref('');

const users = ref<User[]>([]);
const selectedUserId = ref<string>('');

const personName = computed(() => {
  if (auth.isAdmin && selectedUserId.value) {
    return users.value.find((u) => u.id === selectedUserId.value)?.name ?? '—';
  }
  return auth.user?.name ?? '—';
});

const totals = computed(() => computeTotals(entries.value));

const reportData = computed<ReportData>(() => ({
  personName: personName.value,
  month: month.value,
  entries: entries.value,
}));

const messageText = computed(() => buildMessage(reportData.value));

function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
const baseName = computed(
  () => `horas-extras_${slug(personName.value)}_${month.value}`,
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

// ---- ações ----
const snack = ref('');
function toast(msg: string) {
  snack.value = msg;
}

function exportTxt() {
  downloadText(`${baseName.value}.txt`, buildTxt(reportData.value));
}

async function copyMessage() {
  try {
    await navigator.clipboard.writeText(messageText.value);
    toast('Mensagem copiada!');
  } catch {
    toast('Não foi possível copiar automaticamente — selecione e copie o texto.');
  }
}

const canShare = typeof navigator !== 'undefined' && !!navigator.share;
async function shareMessage() {
  try {
    await navigator.share({
      title: `Horas extras — ${monthLabel(month.value)}`,
      text: messageText.value,
    });
  } catch {
    /* usuário cancelou */
  }
}

const pdfLoading = ref(false);
async function exportPdf() {
  pdfLoading.value = true;
  try {
    await downloadPdf(reportData.value, `${baseName.value}.pdf`);
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    pdfLoading.value = false;
  }
}
</script>

<template>
  <h2 class="text-h5 mb-4">Relatório</h2>

  <v-card class="mb-4">
    <v-card-text class="d-flex flex-wrap align-center ga-3">
      <v-btn icon="mdi-chevron-left" variant="text" @click="month = shiftMonth(month, -1)" />
      <span class="text-subtitle-1 text-capitalize" style="min-width: 170px; text-align: center">
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
        style="max-width: 240px"
      />
    </v-card-text>
  </v-card>

  <v-alert v-if="error" type="error" class="mb-4" closable @click:close="error = ''">
    {{ error }}
  </v-alert>

  <v-row>
    <v-col cols="12" md="7">
      <v-card :loading="loading">
        <v-card-title class="text-subtitle-1">
          {{ personName }} — {{ monthLabel(month) }}
        </v-card-title>
        <v-card-text>
          <v-table density="compact" v-if="entries.length">
            <thead>
              <tr>
                <th>Data</th>
                <th>Duração</th>
                <th>Status</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="e in [...entries].sort((a, b) => a.date.localeCompare(b.date))" :key="e.id">
                <td>{{ e.date.slice(8, 10) }}/{{ e.date.slice(5, 7) }}</td>
                <td>{{ minutesToLabel(e.minutes) }}</td>
                <td>{{ e.status[0] + e.status.slice(1).toLowerCase() }}</td>
                <td class="text-medium-emphasis">{{ e.description || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
          <p v-else class="text-medium-emphasis">Nenhum lançamento neste mês.</p>

          <v-divider class="my-3" />
          <div class="d-flex flex-wrap ga-4">
            <div>
              <div class="text-caption text-medium-emphasis">Total</div>
              <div class="text-h6">{{ minutesToLabel(totals.totalMinutes) }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Pendente</div>
              <div class="text-subtitle-1">{{ minutesToLabel(totals.pendente) }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Paga</div>
              <div class="text-subtitle-1">{{ minutesToLabel(totals.paga) }}</div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis">Compensada</div>
              <div class="text-subtitle-1">{{ minutesToLabel(totals.compensada) }}</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-col>

    <v-col cols="12" md="5">
      <v-card>
        <v-card-title class="text-subtitle-1">Exportar</v-card-title>
        <v-card-text class="d-flex flex-column ga-2">
          <v-btn block variant="flat" color="primary" prepend-icon="mdi-file-pdf-box" :loading="pdfLoading" @click="exportPdf">
            Baixar PDF
          </v-btn>
          <v-btn block variant="tonal" prepend-icon="mdi-file-document-outline" @click="exportTxt">
            Baixar .txt
          </v-btn>
          <v-btn block variant="tonal" prepend-icon="mdi-content-copy" @click="copyMessage">
            Copiar mensagem
          </v-btn>
          <v-btn v-if="canShare" block variant="text" prepend-icon="mdi-share-variant" @click="shareMessage">
            Compartilhar
          </v-btn>

          <div class="text-caption text-medium-emphasis mt-2">Prévia da mensagem</div>
          <v-textarea
            :model-value="messageText"
            readonly
            variant="outlined"
            rows="10"
            auto-grow
            class="report-preview"
          />
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <v-snackbar
    :model-value="!!snack"
    :timeout="2500"
    @update:model-value="snack = ''"
  >
    {{ snack }}
  </v-snackbar>
</template>

<style scoped>
.report-preview :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
