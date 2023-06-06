import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Config from '@/views/Config.vue';

const routes = [
    {path: '/', name: 'home', component: Home},
    {path: '/config', name: 'config', component: Config}
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
    linkActiveClass: 'active'
});

export default router;
