<script setup lang="ts">
import StackListItem from '../components/StackListItem.vue';
</script>

<template>
  <div class="d-flex flex-column flex-md-row p-4 gap-4 py-md-5 align-items-center justify-content-center">
  <div class="list-group" v-if="stacks.connected">
    <StackListItem v-for="key in Object.keys(stacks.projects).sort()" :name="key" :value="stacks.projects[key]"></StackListItem>
  </div>

  <div class="alert alert-danger fade show" role="alert" v-else-if="state == 'loaded'">
    Failed to connect to Docker host. Please check <router-link class="alert-link" :to="{name: 'config'}">Config</router-link> for errors.
  </div>

  <div class="spinner-border text-primary" role="status" v-if="state=='loading'">
    <span class="visually-hidden">Loading...</span>
  </div>

</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { endpoints } from '@api';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
  data() {
    return {
      stacks: <endpoints.stack_list.type> {},
      state: <'loading'|'loaded'> 'loading'
    };
  },
  methods: {
  },
  async created() {
    this.stacks = (await ApiClient().get(endpoints.stack_list.url)).data;
    this.state = 'loaded';
  }
});
</script>

<style scoped>
div.spinner-border {
  width: 150px;
  height: 150px;
}

div.list-group {
  width: 100%;
}
</style>
