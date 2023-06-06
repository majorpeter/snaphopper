<script setup lang="ts">
import StackListItem from './StackListItem.vue';

</script>

<template>
  <div class="d-flex flex-column flex-md-row p-4 gap-4 py-md-5 align-items-center justify-content-center">
  <div class="list-group">
    <StackListItem v-for="key in Object.keys(stacks).sort()" :title="key" :value="stacks[key]"></StackListItem>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import axios from "axios";
import { API_PREFIX } from '../js/util';
import { endpoints } from '@api';

export default defineComponent({
  data() {
    return {
      stacks: <endpoints.stack_list.type> {},
      loaded: false
    };
  },
  methods: {
  },
  async created() {
    this.stacks = (await axios.get(API_PREFIX + endpoints.stack_list.url)).data;
    this.loaded = true;
  }
});
</script>