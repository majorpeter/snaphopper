import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import Login from '@/views/Login.vue';
import Home from '@/views/Home.vue';
import Stack from '@/views/Stack.vue';
import Config from '@/views/Config.vue';
import { store } from '@/store';

const redirectUnauthenticatedToLogin = () => {
    if (!store.state.isLoggedIn) {
        return paths.login;
    }
};

export namespace paths {
    export const home = '/';
    export const login = '/login';
    export const stack_by_name = '/stack/:name';
    export const config = '/config';
};

const routes: RouteRecordRaw[] = [
    //TODO eliminate names?
    {path: paths.home, name: 'home', component: Home, beforeEnter: redirectUnauthenticatedToLogin},
    {path: paths.login, name: 'login', component: Login},
    {path: paths.stack_by_name, name: 'stack', component: Stack, beforeEnter: redirectUnauthenticatedToLogin},
    {path: paths.config, name: 'config', component: Config, beforeEnter: redirectUnauthenticatedToLogin}
];

const router = createRouter({
    history: createWebHistory(),
    routes: routes,
    linkActiveClass: 'active'
});

export default router;
