import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router';
import Login from '@/views/Login.vue';
import StackList from '@/views/StackList.vue';
import Stack from '@/views/Stack.vue';
import Config from '@/views/Config.vue';
import { store } from '@/store';
import paths from './paths';

const redirectUnauthenticatedToLogin = () => {
    if (!store.state.isLoggedIn) {
        return paths.login;
    }
};

const routes: RouteRecordRaw[] = [
    //TODO eliminate names?
    {path: paths.home, name: 'home', component: StackList, beforeEnter: redirectUnauthenticatedToLogin},
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
