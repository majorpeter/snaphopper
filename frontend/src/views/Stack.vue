<template>
<h2>{{ name }}</h2>

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
        <td><code>{{ data.zfs_dataset }}</code></td>
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
        <p v-else>{{ i.image.name }} <strong>(custom)</strong></p>
    </td>
    <td>{{ i.state }}</td>
</tr></tbody></table>

<h3>Snapshots</h3>

<div class="accordion" id="snapshotList" v-if="!data.working_directory_error">
    <div class="accordion-item" v-for="(data, name) in snapshots">
    <h4 class="accordion-header" :id="'collapsehead_'+name">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse_'+name" aria-expanded="false" :aria-controls="'collapse_'+name">
        {{ name }}
        </button>
    </h4>
    <div :id="'collapse_'+name" class="accordion-collapse collapse" :aria-labelledby="'collapsehead_'+name" data-bs-parent="#snapshotList">
        <div class="accordion-body">
        Todo: <strong>details, actions</strong>
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
import { API_PREFIX } from '../js/util';
import { endpoints } from '@api';

export default defineComponent({
    data() {
        return {
            name: this.$route.params.name,
            data: <endpoints.stack.type> {},
            compose_file: <string|null> null,
            snapshots: {
                'auto-2023-06-06': {},
                'auto-2023-06-05': {},
                'auto-2023-06-04': {},
                'auto-2023-06-03': {}
            }
        }
    },
    methods: {
        async showComposeFile() {
            this.compose_file = (await axios.get(API_PREFIX + endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name))).data;
        }
    },
    async created() {
        this.data = (await axios.get(API_PREFIX + endpoints.stack.url.replace(':name', <string> this.name))).data;
    }
});
</script>

<style>
textarea#composeFileYaml {
    height: 400px;
    font-family: monospace;
}
</style>
