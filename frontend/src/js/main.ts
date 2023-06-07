import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';
import { store } from '@/store';

// Import our custom CSS
import '../scss/styles.scss';

createApp(App)
.use(router)
.use(store)
.mount('#app');

import 'bootstrap';
