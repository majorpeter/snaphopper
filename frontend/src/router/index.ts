import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue';
import Stack from '@/views/Stack.vue';
import Config from '@/views/Config.vue';

const routes: RouteRecordRaw[] = [
    {path: '/', name: 'home', component: Home, children: []},
    {path: '/stack/:name', name: 'stack', component: Stack},
    {path: '/config', name: 'config', component: Config}
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
    linkActiveClass: 'active'
});

export default router;
