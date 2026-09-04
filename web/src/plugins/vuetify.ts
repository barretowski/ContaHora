import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';
import { getInitialTheme } from '../lib/theme';

export const vuetify = createVuetify({
  theme: {
    defaultTheme: getInitialTheme(),
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#5C9DF5',
          secondary: '#5CBBF6',
          surface: '#1E1E24',
          background: '#141419',
        },
      },
    },
  },
  defaults: {
    VTextField: { variant: 'outlined', density: 'comfortable' },
    VSelect: { variant: 'outlined', density: 'comfortable' },
    VCard: { rounded: 'lg' },
  },
});
