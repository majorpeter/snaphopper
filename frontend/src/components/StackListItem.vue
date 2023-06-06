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
          <table class="table table-hover mb-0 opacity-75"><tbody v-for="item in value.containers">
            <tr>
              <td class="col-sm-4"><strong>{{ item.service }}</strong></td>
              <td class="col-sm-4">{{ item.name }}</td>
              <td class="col-sm-4" :title="item.image_hash">{{ item.image_name }}</td>
            </tr>
          </tbody></table>
        </div>
        <small class="opacity-50 text-nowrap" v-if="value.updateAvailable">Update avail.</small>
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
  }
});
</script>

<style scoped>
.stack-item-icon {
  width: 32px;
  height: 32px;
}
</style>
