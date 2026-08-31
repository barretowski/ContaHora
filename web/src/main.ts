import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { vuetify } from './plugins/vuetify';
import { setUnauthorizedHandler } from './lib/api';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(vuetify);

setUnauthorizedHandler(() => {
  const auth = useAuthStore(pinia);
  auth.logout();
  router.push({ name: 'login' });
});

app.mount('#app');
