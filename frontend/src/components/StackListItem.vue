<script setup lang="ts">
import { endpoints } from '@api';

const props = defineProps<{
    name: string,
    value: endpoints.stack_list.type['projects']['']
}>();
</script>

<template>
    <router-link :to="{name: 'stack', params: {name: name}}" @click="navigatingAway=true" class="list-group-item list-group-item-action d-flex gap-3 py-3" aria-current="false">
      <img v-if="!navigatingAway" src="@/svg/multiple-layers-icon.svg" class="stack-item-icon flex-shrink-0"/>
      <div v-else class="stack-item-icon spinner-border"></div>

      <div class="gap-2 w-100 justify-content-between">
          <h6 class="mb-0 "><strong>{{ name }}</strong></h6>
          <div>
          <table class="table table-hover mb-0 opacity-75"><tbody v-for="item in value.services">
            <tr>
              <td class="col-sm-3"><strong>{{ item.service_name }}</strong></td>
              <td class="col-sm-4">
                <template v-if="item.container_name">{{ item.container_name }}</template>
                <span v-else class="text-muted">N/A</span>
              </td>
              <td class="col-sm-4" :title="item.image_hash">
                <em v-if="item.custom_build">custom build</em>
                <template v-else="item.image_name">{{ item.image_name }}</template>
              </td>
              <td class="col-sm-1" :class="classForStatus(item)">{{ item.state }}</td>
            </tr>
          </tbody></table>
        </div>
        <small class="opacity-50 text-nowrap" v-if="false">Update avail.</small>
      </div>
    </router-link>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  data() {
    return {
      navigatingAway: false
    };
  },
  methods: {
    classForStatus(item: endpoints.stack_list.type['projects']['']['services'][0]) {
      switch (item.state) {
        case 'running':
          return 'text-success';
        case 'N/A':
          return 'text-muted';
        case 'restarting':
        case 'removing':
        case 'exited':
        case 'dead':
          return 'text-warning';
      }
      return '';
    }
  }
});
</script>

<style scoped>
.stack-item-icon {
  width: 32px;
  height: 32px;
}
</style>
