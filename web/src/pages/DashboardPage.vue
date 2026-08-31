<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import { minutesToLabel } from '../lib/time';
import type { SummaryResponse } from '../types';

const year = ref(new Date().getFullYear());
const data = ref<SummaryResponse | null>(null);
const loading = ref(false);
const error = ref('');

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const maxMonth = computed(() =>
  Math.max(1, ...(data.value?.months.map((m) => m.totalMinutes) ?? [0])),
);

const cards = computed(() => {
  const t = data.value?.totals;
  return [
    { label: 'Total no ano', value: t?.totalMinutes ?? 0, color: 'primary', icon: 'mdi-sigma' },
    { label: 'Pendente', value: t?.minutesPendente ?? 0, color: 'warning', icon: 'mdi-clock-alert-outline' },
    { label: 'Paga', value: t?.minutesPaga ?? 0, color: 'success', icon: 'mdi-cash-check' },
    { label: 'Compensada', value: t?.minutesCompensada ?? 0, color: 'info', icon: 'mdi-swap-horizontal' },
  ];
});

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get<SummaryResponse>('/entries/summary', {
      params: { year: String(year.value) },
    });
    data.value = res.data;
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch(year, load);

function pct(v: number) {
  return `${(v / maxMonth.value) * 100}%`;
}
</script>

<template>
  <div class="d-flex align-center ga-3 mb-4">
    <h2 class="text-h5 flex-grow-1">Dashboard</h2>
    <v-btn icon="mdi-chevron-left" variant="text" @click="year--" />
    <span class="text-h6">{{ year }}</span>
    <v-btn icon="mdi-chevron-right" variant="text" @click="year++" />
  </div>

  <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>

  <v-row class="mb-2">
    <v-col v-for="c in cards" :key="c.label" cols="6" md="3">
      <v-card :loading="loading">
        <v-card-text>
          <div class="d-flex align-center ga-2 text-medium-emphasis text-body-2">
            <v-icon :color="c.color" size="small">{{ c.icon }}</v-icon>
            {{ c.label }}
          </div>
          <div class="text-h5 mt-1">{{ minutesToLabel(c.value) }}</div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>

  <v-card>
    <v-card-title class="text-subtitle-1">Horas por mês</v-card-title>
    <v-card-text>
      <div class="chart">
        <div v-for="(m, i) in data?.months ?? []" :key="m.month" class="chart-col">
          <div class="chart-bar-wrap">
            <div class="chart-bar" :style="{ height: pct(m.totalMinutes) }" :title="minutesToLabel(m.totalMinutes)">
              <div class="seg seg-paga" :style="{ flexBasis: m.totalMinutes ? `${(m.minutesPaga / m.totalMinutes) * 100}%` : '0' }" />
              <div class="seg seg-comp" :style="{ flexBasis: m.totalMinutes ? `${(m.minutesCompensada / m.totalMinutes) * 100}%` : '0' }" />
              <div class="seg seg-pend" :style="{ flexBasis: m.totalMinutes ? `${(m.minutesPendente / m.totalMinutes) * 100}%` : '0' }" />
            </div>
          </div>
          <div class="chart-label">{{ MONTHS_SHORT[i] }}</div>
        </div>
      </div>
      <div class="d-flex ga-4 mt-3 text-caption text-medium-emphasis">
        <span><span class="dot seg-pend" /> Pendente</span>
        <span><span class="dot seg-paga" /> Paga</span>
        <span><span class="dot seg-comp" /> Compensada</span>
      </div>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 220px;
}
.chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
}
.chart-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.chart-bar {
  width: 70%;
  min-height: 2px;
  border-radius: 4px 4px 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column-reverse;
  background: rgba(var(--v-theme-primary), 0.12);
}
.seg {
  width: 100%;
}
.seg-pend {
  background: rgb(var(--v-theme-warning));
}
.seg-paga {
  background: rgb(var(--v-theme-success));
}
.seg-comp {
  background: rgb(var(--v-theme-info));
}
.chart-label {
  font-size: 11px;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 3px;
  margin-right: 4px;
  vertical-align: middle;
}
</style>
