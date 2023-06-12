<template>
    <header class="d-flex flex-wrap justify-content-center py-3 mb-4 border-bottom">
        <router-link :to="{name: 'home'}" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto link-body-emphasis text-decoration-none">
            <img src="@/svg/clock-rotate-left-icon.svg" class="d-inline-block align-middle"/>
            <span class="fs-4">snaphopper</span>
        </router-link>
        <ul class="nav nav-pills" v-if="$store.state.isLoggedIn">
            <li class="nav-item">
                <router-link :to="{name: 'home'}" :class="stacksLinkClass" class="nav-link">Stacks</router-link>
            </li>
            <li class="nav-item">
                <router-link :to="{name: 'config'}" class="nav-link">Config</router-link>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link" @click="logout">Logout</a>
            </li>
        </ul>
    </header>
</template>

<script lang="ts">
import paths from '@/router/paths';
import { MutationTypes } from '@/store';
import { defineComponent } from 'vue';
import { stacksPathName } from '@/router';

export default defineComponent({
    methods: {
        logout() {
            //TODO invalidate token
            this.$store.commit(MutationTypes.logout, undefined);
            this.$router.push(paths.login);
        }
    },
    computed: {
        stacksLinkClass() {
            return this.$route.name == stacksPathName ? 'active' : '';
        }
    }
});
</script>

<style scoped>
header > a > img {
    height: 40px;
    margin-right: 8px;
}
</style>
