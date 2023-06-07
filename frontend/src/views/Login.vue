<template>
    <button class="btn btn-primary" @click="login">Log in</button>
</template>

<script lang="ts">
import { paths } from '@/router';
import { MutationTypes } from '@/store';
import { defineComponent } from 'vue';

export default defineComponent({
    methods: {
        login() {
            //TODO actual login check

            //TODO token
            this.$store.commit(MutationTypes.login, 'mytoken');
            this.$router.push(paths.home);
        }
    }
});
</script>
