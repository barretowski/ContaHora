<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { api, apiErrorMessage } from '../lib/api';
import { minutesToLabel } from '../lib/time';
import { currentMonthKey, shiftMonth, monthLabel } from '../lib/month';
import type { SummaryResponse, OvertimeEntry } from '../types';

type Mode = 'year' | 'month';
const MODE_KEY = 'contahora.dash.mode';
function savedMode(): Mode {
  try {
    const v = localStorage.getItem(MODE_KEY);
    if (v === 'year' || v === 'month') return v;
  } catch {
    /* ignore */
  }
  return 'year';
}

const mode = ref<Mode>(savedMode());
const year = ref(new Date().getFullYear());
const month = ref(currentMonthKey());
const loading = ref(false);
const error = ref('');

const yearData = ref<SummaryResponse | null>(null);
const monthEntries = ref<OvertimeEntry[]>([]);

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface Bar {
  key: string;
  label: string;
  total: number;
  pendente: number;
  paga: number;
  compensada: number;
}

const bars = computed<Bar[]>(() => {
  if (mode.value === 'year') {
    return (yearData.value?.months ?? []).map((m, i) => ({
      key: m.month,
      label: MONTHS_SHORT[i],
      total: m.totalMinutes,
      pendente: m.minutesPendente,
      paga: m.minutesPaga,
      compensada: m.minutesCompensada,
    }));
  }
  const [y, mo] = month.value.split('-').map(Number);
  const days = new Date(y, mo, 0).getDate();
  const buckets: Bar[] = Array.from({ length: days }, (_, i) => ({
    key: String(i + 1),
    label: String(i + 1),
    total: 0,
    pendente: 0,
    paga: 0,
    compensada: 0,
  }));
  for (const e of monthEntries.value) {
    const b = buckets[Number(e.date.slice(8, 10)) - 1];
    if (!b) continue;
    b.total += e.minutes;
    if (e.status === 'PENDENTE') b.pendente += e.minutes;
    else if (e.status === 'PAGA') b.paga += e.minutes;
    else b.compensada += e.minutes;
  }
  return buckets;
});

const maxBar = computed(() => Math.max(1, ...bars.value.map((b) => b.total)));
const pct = (v: number) => `${(v / maxBar.value) * 100}%`;
const seg = (part: number, total: number) => (total ? `${(part / total) * 100}%` : '0');

const totals = computed(() => {
  if (mode.value === 'year') {
    const t = yearData.value?.totals;
    return {
      total: t?.totalMinutes ?? 0,
      pendente: t?.minutesPendente ?? 0,
      paga: t?.minutesPaga ?? 0,
      compensada: t?.minutesCompensada ?? 0,
    };
  }
  return bars.value.reduce(
    (a, b) => ({
      total: a.total + b.total,
      pendente: a.pendente + b.pendente,
      paga: a.paga + b.paga,
      compensada: a.compensada + b.compensada,
    }),
    { total: 0, pendente: 0, paga: 0, compensada: 0 },
  );
});

const periodo = computed(() => (mode.value === 'year' ? 'no ano' : 'no mês'));
const periodoLabel = computed(() =>
  mode.value === 'year' ? String(year.value) : monthLabel(month.value),
);
const chartTitle = computed(() =>
  mode.value === 'year' ? 'Horas por mês' : 'Horas por dia',
);

const cards = computed(() => [
  { label: `Total ${periodo.value}`, value: totals.value.total, color: 'primary', icon: 'mdi-sigma' },
  { label: 'Pendente', value: totals.value.pendente, color: 'warning', icon: 'mdi-clock-alert-outline' },
  { label: 'Paga', value: totals.value.paga, color: 'success', icon: 'mdi-cash-check' },
  { label: 'Compensada', value: totals.value.compensada, color: 'info', icon: 'mdi-swap-horizontal' },
]);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    if (mode.value === 'year') {
      const res = await api.get<SummaryResponse>('/entries/summary', {
        params: { year: String(year.value) },
      });
      yearData.value = res.data;
    } else {
      const res = await api.get<OvertimeEntry[]>('/entries', {
        params: { month: month.value },
      });
      monthEntries.value = res.data;
    }
  } catch (e) {
    error.value = apiErrorMessage(e);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
watch([mode, year, month], load);
watch(mode, (m) => {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
});

function prev() {
  if (mode.value === 'year') year.value--;
  else month.value = shiftMonth(month.value, -1);
}
function next() {
  if (mode.value === 'year') year.value++;
  else month.value = shiftMonth(month.value, 1);
}
</script>

<template>
  <div class="d-flex flex-wrap align-center ga-3 mb-4">
    <h2 class="text-h5 flex-grow-1">Dashboard</h2>

    <v-btn-toggle v-model="mode" mandatory density="compact" variant="outlined" divided>
      <v-btn value="year" size="small">Ano</v-btn>
      <v-btn value="month" size="small">Mês</v-btn>
    </v-btn-toggle>

    <div class="d-flex align-center">
      <v-btn icon="mdi-chevron-left" variant="text" @click="prev" />
      <span class="text-subtitle-1 text-capitalize" style="min-width: 130px; text-align: center">
        {{ periodoLabel }}
      </span>
      <v-btn icon="mdi-chevron-right" variant="text" @click="next" />
    </div>
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
    <v-card-title class="text-subtitle-1">
      {{ chartTitle }} — <span class="text-capitalize">{{ periodoLabel }}</span>
    </v-card-title>
    <v-card-text>
      <div class="chart-scroll">
        <div class="chart" :style="{ minWidth: mode === 'month' ? '620px' : '' }">
          <div v-for="b in bars" :key="b.key" class="chart-col">
            <div class="chart-bar-wrap">
              <div
                class="chart-bar"
                :style="{ height: pct(b.total) }"
                :title="`${b.label}: ${minutesToLabel(b.total)}`"
              >
                <div class="seg seg-paga" :style="{ flexBasis: seg(b.paga, b.total) }" />
                <div class="seg seg-comp" :style="{ flexBasis: seg(b.compensada, b.total) }" />
                <div class="seg seg-pend" :style="{ flexBasis: seg(b.pendente, b.total) }" />
              </div>
            </div>
            <div class="chart-label" :class="{ 'chart-label--sm': mode === 'month' }">
              {{ b.label }}
            </div>
          </div>
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
.chart-scroll {
  overflow-x: auto;
}
.chart {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 220px;
}
.chart-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-width: 14px;
}
.chart-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.chart-bar {
  width: 72%;
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
.chart-label--sm {
  font-size: 10px;
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
