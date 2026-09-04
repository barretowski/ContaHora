<script setup lang="ts">
defineProps<{ title: string; subtitle?: string }>();
</script>

<template>
  <v-main class="d-flex align-center justify-center" style="min-height: 100vh">
    <v-card class="pa-6" width="400" elevation="4">
      <div class="text-center mb-4">
        <v-icon size="40" color="primary">mdi-clock-check-outline</v-icon>
        <h1 class="text-h6 mt-2">{{ title }}</h1>
        <p v-if="subtitle" class="text-body-2 text-medium-emphasis">{{ subtitle }}</p>
      </div>
      <slot />
    </v-card>
  </v-main>
</template>
