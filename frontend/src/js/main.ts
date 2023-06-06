import { createApp } from 'vue';
import App from './App.vue';
import router from '@/router';

// Import our custom CSS
import '../scss/styles.scss';

createApp(App)
.use(router)
.mount('#app');

import 'bootstrap/dist/js/bootstrap.js';
