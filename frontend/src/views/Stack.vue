<template>
<h2><img src="@/svg/multiple-layers-icon.svg" class="d-inline-block align-middle"/> {{ name }}</h2>

<h3>Services</h3>

<div class="alert alert-danger alert-dismissible fade show" role="alert" v-if="data.working_directory_error">
    Cannot determine Docker Compose working directory! Compose project names may be overlapping.
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
</div>

<div class="mb-5"><table class="table w-auto"><tbody>
    <tr>
        <th>Docker-compose working dir:</th>
        <td><code>{{ data.working_directory }}</code></td>
    </tr><tr>
        <th>Docker-compose file:</th>
        <td v-if="data.compose_config_file">
            <code>{{ data.compose_config_file }}</code>
            &nbsp;
            <button type="button" class="btn btn-primary" @click="showComposeFile" :disabled="composeFile.loading">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="composeFile.loading"></span>
                Show
            </button>
        </td>
    </tr><tr>
        <th>ZFS Dataset:</th>
        <td>
            <template v-if="data.zfs_available">
                <code v-if="data.zfs_dataset">{{ data.zfs_dataset?.name }}</code>
                <template v-else><span class="badge rounded-pill bg-danger">Error</span> Not in a separate dataset. Snapshotting is not available.</template>
            </template><template v-else>
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
</tbody></table></div>

<div class="mb-5"><table class="table table-hover"><thead><tr>
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
            <strong>from</strong> <a :href="i.image.base_url!" target="_blank">{{ i.image.base }}</a>
        </p>
    </td>
    <td>{{ i.state }}</td>
</tr></tbody></table></div>

<template v-if="data.zfs_available && data.zfs_dataset">
<h3>
    Snapshots
    <span v-if="zfs_snapshots"> ({{ zfs_snapshots.length }})</span>
    <button type="button" @click="showSnapshotCreateDialog" class="btn btn-primary float-end">Create</button>
</h3>

<div class="accordion" id="snapshotList" v-if="!data.working_directory_error">
    <div class="accordion-item" v-for="(snapshot, i) in zfs_snapshots">
    <h4 class="accordion-header" :id="'collapsehead_'+i">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse_'+i" aria-expanded="false" :aria-controls="'collapse_'+i">
        {{ snapshot.name }}
        </button>
    </h4>
    <div :id="'collapse_'+i" class="accordion-collapse collapse" :aria-labelledby="'collapsehead_'+i" data-bs-parent="#snapshotList">
        <div class="accordion-body">
            <p>Used: <strong>{{ snapshot.used }}</strong></p>
            <p>Referenced: <strong>{{ snapshot.referenced }}</strong></p>

            <button @click="cloneSnapshotClicked(snapshot.name)" class="btn btn-primary">Clone</button>
        </div>
    </div>
    </div>
</div>
</template>

<!-- Modal for docker-compose file display -->
<div class="modal modal-lg fade" id="composeFileModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h1 class="modal-title fs-5">{{ data.working_directory}}/{{ data.compose_config_file }}</h1>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <textarea class="form-control" readonly id="composeFileYaml">{{ composeFile.content }}</textarea>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      </div>
    </div>
  </div>
</div>

<!-- Modal for snapshot creation -->
<div class="modal fade" id="snapshotCreateModal" ref="snapshotCreateModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Create new Snapshot</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="createSnapshot.state=='creating'"></button>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger fade show" role="alert" v-if="createSnapshot.state=='error'">
            Failed to create snapshot:
            <ul><li>{{ createSnapshot.error_message }}</li></ul>
        </div>

        <form>
          <div class="mb-3">
            <label for="snapshotCreateModalDataset" class="col-form-label">Dataset:</label>
            <input type="text" class="form-control" id="snapshotCreateModalDataset" readonly v-model="createSnapshot.model.dataset"/>
          </div>
          <div class="mb-3">
            <label for="snapshotCreateModalName" class="col-form-label">Snapshot name:</label>
            <input class="form-control" id="snapshotCreateModalName" v-model="createSnapshot.model.name" :readonly="createSnapshot.state=='creating'"/>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="createSnapshot.state=='creating'">Close</button>
        <button type="button" class="btn btn-primary" @click="createSnapshotBtnClicked" :disabled="createSnapshot.state=='creating'">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="createSnapshot.state=='creating'"></span>
            Create
        </button>
      </div>
    </div>
  </div>
</div>

<StackSnapshotClone ref="stackSnapshotClone" :dataset-name="data.zfs_dataset?.name"></StackSnapshotClone>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { AxiosError } from "axios";
import { endpoints } from '@api';
import { Modal } from 'bootstrap';
import StackSnapshotClone from './Stack/StackSnapshotClone.vue';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
    components: {
        StackSnapshotClone
    },
    data() {
        return {
            name: this.$route.params.name,
            data: <endpoints.stack.type> {},
            zfs_snapshots: <endpoints.snapshot.list.resp_type> [],
            composeFile: {
                modal: <Modal> {},
                content: <string|null> null,
                loading: false
            },
            createSnapshot: {
                modal: <Modal> {},
                model: {
                    dataset: '',
                    name: ''
                },
                state: <'idle'|'creating'|'error'> 'idle',
                error_message: ''
            }
        }
    },
    mounted() {
        this.composeFile.modal = new Modal(<Element> document.getElementById('composeFileModal'));
        this.createSnapshot.modal = new Modal(<Element> document.getElementById('snapshotCreateModal'), {
            backdrop: 'static'
        });
    },
    methods: {
        setData(_data: typeof this.data) {
            this.data = _data;
            this.updateSnapshots();
        },
        updateSnapshots() {
            if (this.data.zfs_dataset) {
                ApiClient().get(endpoints.snapshot.list.url, {params: <endpoints.snapshot.list.req_type> {
                    dataset: this.data.zfs_dataset?.name
                }}).then((value) => {
                    this.zfs_snapshots = value.data;
                });
            }
        },
        async showComposeFile() {
            this.composeFile.loading = true;
            this.composeFile.content = (await ApiClient().get(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name))).data;
            this.composeFile.loading = false;

            this.composeFile.modal.show();
        },
        showSnapshotCreateDialog() {
            // TODO get suggestion from backend
            const now = new Date();
            const isoStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
            const date = isoStr.split('T')[0];
            const time = isoStr.split('T')[1].split(':');

            this.createSnapshot.model = {
                dataset: this.data.zfs_dataset!.name,
                name: `manual-${date}_${time[0]}-${time[1]}`
            }

            this.createSnapshot.modal.show();
        },
        async createSnapshotBtnClicked() {
            this.createSnapshot.state = 'creating';
            try {
                await ApiClient().post(endpoints.snapshot.create.url, <endpoints.snapshot.create.req_type> {
                    dataset: this.createSnapshot.model.dataset,
                    name: this.createSnapshot.model.name
                });
                this.createSnapshot.state = 'idle';
                this.createSnapshot.modal.hide();

                this.updateSnapshots();
            } catch (e) {
                const resp = <endpoints.snapshot.create.error_resp_type> (<AxiosError> e).response?.data;
                this.createSnapshot.error_message = resp.message;
                this.createSnapshot.state = 'error';
            }
        },
        cloneSnapshotClicked(snapshot: string) {
            (<typeof StackSnapshotClone> this.$refs.stackSnapshotClone).show(snapshot);
        }
    },
    async beforeRouteEnter(to, from, next) {
        let promise = ApiClient().get(endpoints.stack.url.replace(':name', <string> to.params.name));

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
