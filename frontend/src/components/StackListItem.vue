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
          <h6 class="mb-0"><strong>{{ name }}</strong></h6>
          <div>

          <table class="table mb-0 opacity-75" v-if="loading"><tbody>
            <tr>
              <td class="placeholder-glow col-sm-3"><span class="placeholder" :style="{width: Math.floor(30 + Math.random()*40) + '%'}"></span></td>
              <td class="placeholder-glow col-sm-4"><span class="placeholder" :style="{width: Math.floor(30 + Math.random()*40) + '%'}"></span></td>
              <td class="placeholder-glow col-sm-4"><span class="placeholder" :style="{width: Math.floor(30 + Math.random()*40) + '%'}"></span></td>
              <td class="placeholder-glow col-sm-1"><span class="placeholder" style="width: 70%"></span></td>
          </tr></tbody></table>
          <table class="table table-hover mb-0 opacity-75" v-else-if="services && services.status=='ok'"><tbody v-for="item, service_name in services.data">
            <tr>
              <td class="col-sm-3"><strong>{{ service_name }}</strong></td>
              <td class="col-sm-4">
                <template v-if="item.container_name">{{ item.container_name }}</template>
                <span v-else class="text-muted">N/A</span>
              </td>
              <td class="col-sm-4">
                <ContainerInfo :service-name="<string> service_name" :stack-name="name" :service-data="item"></ContainerInfo>
              </td>
              <td class="col-sm-1" :class="containerStatusColor(item.status)">{{ item.status }}</td>
            </tr>
          </tbody></table>
          <div class="alert alert-warning show mt-3" role="alert" v-else-if="value.status=='access_error'">
            Cannot access <em>docker-compose</em> file!
          </div>
          <div class="alert alert-warning show mt-3" role="alert" v-else-if="services && services.status=='invalid_compose_file'">
            <em>docker-compose</em> file is not valid!
          </div>
        </div>
        <small class="opacity-50 text-nowrap" v-if="false">Update avail.</small>
      </div>
    </router-link>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ContainerInfo from './ContainerInfo.vue';
import containerStatusColor from '@/services/ContainerStatusColor';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
  components: {
    ContainerInfo,
},
  data() {
    return {
      services: <endpoints.stack.services.type | null> null,
      loading: this.value.status == 'ok' /* no need to load if not okay */,
      navigatingAway: false
    };
  },
  async created() {
    if (this.loading) {
      this.services = (await ApiClient().get(endpoints.stack.services.url.replace(':name', this.name))).data;
      this.loading = false;
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
