<script setup lang="ts">
import { endpoints } from '@api';

const props = defineProps<{
    title: string,
    value: endpoints.stack_list.type['projects']['']
}>();
</script>

<template>
    <a href="#" class="list-group-item list-group-item-action d-flex gap-3 py-3" aria-current="false">
      <img src="https://github.com/docker.png" width="32" height="32" class="flex-shrink-0">
      <div class="d-flex gap-2 w-100 justify-content-between">
        <div>
          <h6 class="mb-0">{{ title }}</h6>
          <ul class="mb-0 opacity-75" v-for="item in value.containers">
            <li>{{ item }}</li>
          </ul>
        </div>
        <small class="opacity-50 text-nowrap" v-if="value.updateAvailable">Update avail.</small>
      </div>
    </a>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
});
</script>