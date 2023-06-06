<script setup lang="ts">
import Header from '@/components/Header.vue';
import Footer from '@/components/Footer.vue';
</script>

<template>
    <div class="container py-4 px-3 mx-auto">
      <Header></Header>
      <router-view></router-view>
      <Footer></Footer>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    data() {
        return {
        };
    }
});
</script>
