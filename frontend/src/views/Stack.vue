<template>
<h2><img src="@/svg/multiple-layers-icon.svg" class="d-inline-block align-middle"/> {{ name }}</h2>

<h3>Services</h3>

<div class="alert alert-danger alert-dismissible fade show" role="alert" v-if="data.working_directory_error">
    Cannot determine Docker Compose working directory! Compose project names may be overlapping.
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>

<table class="table w-auto mb-3"><tbody>
    <tr>
        <th>Docker-compose working dir:</th>
        <td><code>{{ data.working_directory }}</code></td>
    </tr><tr>
        <th>Docker-compose file:</th>
        <td v-if="data.compose_config_file">
            <code>{{ data.compose_config_file }}</code>
            &nbsp;
            <button type="button" class="btn btn-primary" @click="showComposeFile" data-bs-toggle="modal" data-bs-target="#composeFileModal">Show</button>
        </td>
    </tr><tr>
        <th>ZFS Dataset:</th>
        <td>
            <code v-if="data.zfs_dataset">{{ data.zfs_dataset?.name }}</code>
            <template v-if="!data.zfs_available">
                <span class="badge rounded-pill text-bg-warning">Unavailable</span>
                Cannot use ZFS functionality on host.
            </template>
        </td>
    </tr><tr v-if="data.zfs_dataset">
        <th>Filesystem usage:</th>
        <td>
            <p class="m-0">Used: <strong>{{ data.zfs_dataset.used }}</strong></p>
            <p class="m-0">Referenced: <strong>{{ data.zfs_dataset.referenced }}</strong></p>
        </td>
    </tr><tr>
        <th>Services count:</th>
        <td v-if="data.containers">{{ data.containers.length }}</td>
    </tr>
</tbody></table>

<table class="table table-hover"><thead><tr>
    <th>Service</th>
    <th>Container name</th>
    <th>Image</th>
    <th>State</th>
</tr></thead><tbody><tr v-for="i in data.containers">
    <td>{{ i.service }}</td>
    <td>{{ i.name }}</td>
    <td :title="i.image.hash">
        <a v-if="i.image.url" :href="i.image.url" target="_blank">{{ i.image.name }}</a>
        <p v-else>
            {{ i.image.name }} <strong>(custom)</strong><br/>
            <strong>based on</strong> <a :href="i.image.base_url!" target="_blank">{{ i.image.base }}</a>
        </p>
    </td>
    <td>{{ i.state }}</td>
</tr></tbody></table>

<h3>Snapshots<span v-if="data.zfs_snapshots"> ({{ data.zfs_snapshots.length }})</span></h3>

<div class="accordion" id="snapshotList" v-if="!data.working_directory_error">
    <div class="accordion-item" v-for="(snapshot, i) in data.zfs_snapshots">
    <h4 class="accordion-header" :id="'collapsehead_'+i">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse_'+i" aria-expanded="false" :aria-controls="'collapse_'+i">
        {{ snapshot.name }}
        </button>
    </h4>
    <div :id="'collapse_'+i" class="accordion-collapse collapse" :aria-labelledby="'collapsehead_'+i" data-bs-parent="#snapshotList">
        <div class="accordion-body">
        <p>Used: <strong>{{ snapshot.used }}</strong></p>
        <p>Referenced: <strong>{{ snapshot.referenced }}</strong></p>
        </div>
    </div>
    </div>
</div>

<div class="modal modal-lg fade" id="composeFileModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5">{{ data.working_directory}}/{{ data.compose_config_file }}</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <textarea class="form-control" readonly id="composeFileYaml">{{ compose_file }}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import axios from "axios";
import { endpoints } from '@api';

export default defineComponent({
    data() {
        return {
            name: this.$route.params.name,
            data: <endpoints.stack.type> {},
            compose_file: <string|null> null,
        }
    },
    methods: {
        setData(_data: typeof this.data) {
            this.data = _data;
        },
        async showComposeFile() {
            this.compose_file = (await axios.get(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name))).data;
        }
    },
    async beforeRouteEnter(to, from, next) {
        let promise = axios.get(endpoints.stack.url.replace(':name', <string> to.params.name));

        const navigatingFromOtherPage = (from.name !== undefined);
        if (navigatingFromOtherPage) {
            await promise;  // only block navigating if we're navigating, skip for refreshing/direct link
        }

        next(async (vm: any) => vm.setData((await promise).data));
    }
});
</script>

<style scoped>
textarea#composeFileYaml {
    height: 400px;
    font-family: monospace;
}
</style>
