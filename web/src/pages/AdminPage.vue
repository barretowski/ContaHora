<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import { currentMonthKey, shiftMonth, monthLabel } from '../lib/month';
import { minutesToLabel } from '../lib/time';
import type { OverviewResponse } from '../types';

const month = ref(currentMonthKey());
const data = ref<OverviewResponse | null>(null);
const loading = ref(false);
const error = ref('');

const headers = [
  { title: 'Funcionário', key: 'name' },
  { title: 'Total', key: 'totalMinutes', align: 'end' as const },
  { title: 'Pendente', key: 'minutesPendente', align: 'end' as const },
  { title: 'Paga', key: 'minutesPaga', align: 'end' as const },
  { title: 'Compensada', key: 'minutesCompensada', align: 'end' as const },
  { title: 'Lçtos', key: 'count', align: 'end' as const },
];

const cards = computed(() => {
  const t = data.value?.totals;
  const activeCount = data.value?.users.length ?? 0;
  return [
    { label: 'Funcionários ativos', value: String(activeCount), icon: 'mdi-account-group', color: 'primary' },
    { label: 'Horas da equipe no mês', value: minutesToLabel(t?.totalMinutes ?? 0), icon: 'mdi-sigma', color: 'primary' },
    { label: 'Pendente de pagamento', value: minutesToLabel(t?.minutesPendente ?? 0), icon: 'mdi-clock-alert-outline', color: 'warning' },
    { label: 'Lançamentos no mês', value: String(t?.count ?? 0), icon: 'mdi-table-clock', color: 'primary' },
  ];
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const { data: res } = await api.get<OverviewResponse>('/entries/overview', {
      params: { month: month.value },
    });
    data.value = res;
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(month, load);
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-3 mb-4">
    <h2 class="text-h5 flex-grow-1">Admin</h2>
    <v-btn :to="{ name: 'users' }" variant="tonal" prepend-icon="mdi-account-cog">
      Gerenciar funcionários
    </v-btn>
  </div>

  <v-card class="mb-4">
    <v-card-text class="d-flex flex-wrap align-center ga-3">
      <v-btn icon="mdi-chevron-left" variant="text" @click="month = shiftMonth(month, -1)" />
      <span class="text-subtitle-1 text-capitalize" style="min-width: 170px; text-align: center">
        {{ monthLabel(month) }}
      </span>
      <v-btn icon="mdi-chevron-right" variant="text" @click="month = shiftMonth(month, 1)" />
    </v-card-text>
  </v-card>

  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

  <v-row class="mb-2">
    <v-col v-for="c in cards" :key="c.label" cols="6" md="3">
      <v-card :loading="loading">
        <v-card-text>
          <div class="d-flex align-center ga-2 text-medium-emphasis text-body-2">
            <v-icon :color="c.color" size="small">{{ c.icon }}</v-icon>
            {{ c.label }}
          </div>
          <div class="text-h5 mt-1">{{ c.value }}</div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <v-card>
    <v-card-title class="text-subtitle-1">Por funcionário — {{ monthLabel(month) }}</v-card-title>
    <v-data-table
      :headers="headers"
      :items="data?.users ?? []"
      :loading="loading"
      density="comfortable"
      :items-per-page="-1"
      no-data-text="Sem funcionários ativos"
    >
      <template #[`item.totalMinutes`]="{ item }">
        <span class="font-weight-medium">{{ minutesToLabel(item.totalMinutes) }}</span>
      </template>
      <template #[`item.minutesPendente`]="{ item }">{{ minutesToLabel(item.minutesPendente) }}</template>
      <template #[`item.minutesPaga`]="{ item }">{{ minutesToLabel(item.minutesPaga) }}</template>
      <template #[`item.minutesCompensada`]="{ item }">{{ minutesToLabel(item.minutesCompensada) }}</template>
    </v-data-table>
  </v-card>
</template>
