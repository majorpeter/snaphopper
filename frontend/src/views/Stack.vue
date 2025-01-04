<template>
<h2><img src="@/svg/multiple-layers-icon.svg" class="d-inline-block align-middle"/> {{ name }}</h2>

<h3>
    Services
    <button :disabled="!data.compose_config_file_name" class="btn btn-primary dropdown-toggle float-end" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="dockerComposeExecuting"></span>
        Docker-Compose Actions
    </button>
    <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" :class="dockerComposeExecuting ? 'disabled' : ''" title="Start or recreate services" @click="dockerComposeUp" href="#">Up</a></li>
        <li><a class="dropdown-item" :class="dockerComposeExecuting ? 'disabled' : ''" title="Stop services" @click="dockerComposeDown" href="#">Down</a></li>
        <li><a class="dropdown-item" :class="dockerComposeExecuting ? 'disabled' : ''" title="Pull containers" @click="dockerComposePull" href="#">Pull</a></li>
        <li><a class="dropdown-item" :class="dockerComposeExecuting ? 'disabled' : ''" title="Build custom containers" @click="dockerComposeBuild" href="#">Build</a></li>
        <div class="dropdown-divider"></div>
        <li><a class="dropdown-item" :class="dockerComposeExecuting ? 'disabled' : ''" title="Watch logs" @click="dockerComposeLogsWatch" href="#">Logs</a></li>
    </ul>
</h3>

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
        <td v-if="data.compose_config_file_name">
            <code>{{ data.compose_config_file_name }}</code>
            &nbsp;
            <button type="button" class="btn btn-primary" @click="showComposeFileClicked()" :disabled="composeFileLoading || dockerComposeExecuting">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="composeFileLoading"></span>
                ...
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
        <td v-if="data.services">{{ Object.keys(data.services).length }}</td>
    </tr>
</tbody></table></div>

<div class="alert alert-danger show mb-5" role="alert" v-if="data.compose_config_invalid">
    Docker Compose file is not valid!
</div>

<div class="mb-5" v-if="Object.keys(data.services).length"><table class="table table-hover"><thead><tr>
    <th>Service</th>
    <th>Container name</th>
    <th>Image</th>
    <th>State</th>
</tr></thead><tbody><tr v-for="i, service_name in data.services">
    <td>{{ service_name }}</td>
    <td>
        <template v-if="i.container_name">{{ i.container_name }}</template>
        <span class="text-muted" v-else>N/A</span>
    </td>
    <td>
        <ContainerInfo :stack-name="<string> name" :service-name="<string> service_name" :service-data="i" :message-modal="$refs.message"></ContainerInfo>
    </td>
    <td :class="containerStatusColor(i.status)">{{ i.status }}</td>
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
            Docker-compose file
            <button @click="showComposeFileClicked(snapshot.name)" class="btn btn-primary me-1">Show</button>
            <button @click="diffComposeFileClicked(snapshot.name)" class="btn btn-primary me-1">Compare</button>

            <p>Used: <strong>{{ snapshot.used }}</strong></p>
            <p>Referenced: <strong>{{ snapshot.referenced }}</strong></p>

            <button @click="cloneSnapshotClicked(snapshot.name)" class="btn btn-primary me-1">Clone</button>
            <button @click="rollbackSnapshotClicked(snapshot.name)" class="btn btn-primary me-1">Rollback</button>
            <button @click="removeSnapshotClicked(snapshot.name)" class="btn btn-danger me-1">Remove</button>
        </div>
    </div>
    </div>
</div>
</template>

<!-- Modal for snapshot creation -->
<div class="modal fade" id="snapshotCreateModal" ref="snapshotCreateModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Create new Snapshot</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="createSnapshotModal.state=='creating'"></button>
      </div>
      <div class="modal-body">
        <div class="alert alert-danger fade show" role="alert" v-if="createSnapshotModal.state=='error'">
            Failed to create snapshot:
            <ul><li>{{ createSnapshotModal.error_message }}</li></ul>
        </div>

        <form>
          <div class="mb-3">
            <label for="snapshotCreateModalDataset" class="col-form-label">Dataset:</label>
            <input type="text" class="form-control" id="snapshotCreateModalDataset" readonly v-model="createSnapshotModal.model.dataset"/>
          </div>
          <div class="mb-3">
            <label for="snapshotCreateModalName" class="col-form-label">Snapshot name:</label>
            <input class="form-control" id="snapshotCreateModalName" v-model="createSnapshotModal.model.name" :readonly="createSnapshotModal.state=='creating'"/>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="createSnapshotModal.state=='creating'">Close</button>
        <button type="button" class="btn btn-primary" @click="createSnapshotBtnClicked" :disabled="createSnapshotModal.state=='creating'">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="createSnapshotModal.state=='creating'"></span>
            Create
        </button>
      </div>
    </div>
  </div>
</div>

<DockerComposeFile ref="composeFile" :name="<string> name"
    :filepath="data.working_directory + '/' + data.compose_config_file_name"
    :can-close="!dataReloading"
    :create-snapshot="createSnapshot"
    :compose-up="dockerComposeUp"
    @compose-file-changed="reloadData"></DockerComposeFile>
<StackSnapshotClone ref="stackSnapshotClone" :dataset-name="data.zfs_dataset?.name"></StackSnapshotClone>
<MessageModal ref="message"></MessageModal>

</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { AxiosError } from "axios";
import { endpoints } from '@api';
import { Modal } from 'bootstrap';

import MessageModal from '@/components/MessageModal.vue';
import DockerComposeFile from './Stack/DockerComposeFile.vue';
import StackSnapshotClone from './Stack/StackSnapshotClone.vue';
import ContainerInfo from '@/components/ContainerInfo.vue';

import ApiClient, {WebSocketClient} from '@/services/ApiClient';
import containerStatusColor from '@/services/ContainerStatusColor';

export function generateSnapshotName(prefix: string): string {
    // TODO get suggestion from backend?
    const now = new Date();
    const isoStr = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString();
    const date = isoStr.split('T')[0];
    const time = isoStr.split('T')[1].split(':');
    return `${prefix}-${date}_${time[0]}-${time[1]}`;
}

export default defineComponent({
    components: {
        MessageModal,
        DockerComposeFile,
        StackSnapshotClone,
        ContainerInfo
    },
    data() {
        return {
            name: this.$route.params.name,
            data: <endpoints.stack.type> {services: {}},
            dataReloading: false,
            zfs_snapshots: <endpoints.snapshot.list.resp_type> [],
            dockerComposeExecuting: false,
            createSnapshotModal: {
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
        this.createSnapshotModal.modal = new Modal(<Element> document.getElementById('snapshotCreateModal'), {
            backdrop: 'static',
            keyboard: false
        });
    },
    methods: {
        setData(_data: typeof this.data) {
            this.data = _data;
            this.updateSnapshots();
        },
        async updateSnapshots() {
            if (this.data.zfs_dataset) {
                this.zfs_snapshots = (await ApiClient().get(endpoints.snapshot.list.url, {params: <endpoints.snapshot.list.query_type> {
                    dataset: this.data.zfs_dataset?.name
                }})).data;
            }
        },
        async reloadData() {
            this.dataReloading = true;
            try {
                this.data = (await ApiClient().get(endpoints.stack.url.replace(':name', <string> this.name))).data;
            } catch (e) {
            } finally {
                this.dataReloading = false;
            }
        },
        async dockerComposeUp() {
            if (this.dockerComposeExecuting) {
                return;
            }

            const messageModal = <typeof MessageModal> this.$refs.message;
            this.dockerComposeExecuting = true;
            messageModal.showConsole('Compose up');
            messageModal.showSpinner = true;
            try {
                await ApiClient().post(endpoints.stack.docker_compose.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose.post_req_type> {
                    command: 'up'
                }, {
                    onDownloadProgress(progressEvent) {
                        messageModal.consoleOutput = progressEvent.event.currentTarget.response;
                    }
                });
                messageModal.showSpinner = false;
                this.reloadData();
            } catch (e) {
                (<typeof MessageModal> this.$refs.message).show('"docker-compose up -d" failed', 'Command failed');
            }
            this.dockerComposeExecuting = false;
        },
        async dockerComposeDown() {
            if (this.dockerComposeExecuting) {
                return;
            }

            const messageModal = <typeof MessageModal> this.$refs.message;
            this.dockerComposeExecuting = true;
            messageModal.showConsole('Compose down');
            messageModal.showSpinner = true;
            try {
                await ApiClient().post(endpoints.stack.docker_compose.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose.post_req_type> {
                    command: 'down'
                }, {
                    onDownloadProgress(progressEvent) {
                        messageModal.consoleOutput = progressEvent.event.currentTarget.response;
                    }
                });
                messageModal.showSpinner = false;
                this.reloadData();
            } catch (e) {
                (<typeof MessageModal> this.$refs.message).show('"docker-compose down" failed', 'Command failed');
            }
            this.dockerComposeExecuting = false;
        },
        async dockerComposePull() {
            if (this.dockerComposeExecuting) {
                return;
            }

            const messageModal = <typeof MessageModal> this.$refs.message;
            this.dockerComposeExecuting = true;
            messageModal.showConsole('Compose pull');
            messageModal.showSpinner = true;
            try {
                await ApiClient().post(endpoints.stack.docker_compose.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose.post_req_type> {
                    command: 'pull'
                }, {
                    onDownloadProgress(progressEvent) {
                        messageModal.consoleOutput = progressEvent.event.currentTarget.response;
                    }
                });
                messageModal.showSpinner = false;
                this.reloadData();
            } catch (e) {
                (<typeof MessageModal> this.$refs.message).show('"docker-compose build" failed', 'Command failed');
            }
            this.dockerComposeExecuting = false;
        },
        async dockerComposeBuild() {
            if (this.dockerComposeExecuting) {
                return;
            }

            const messageModal = <typeof MessageModal> this.$refs.message;
            this.dockerComposeExecuting = true;
            messageModal.showConsole('Compose build');
            messageModal.showSpinner = true;
            try {
                await ApiClient().post(endpoints.stack.docker_compose.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose.post_req_type> {
                    command: 'build'
                }, {
                    onDownloadProgress(progressEvent) {
                        messageModal.consoleOutput = progressEvent.event.currentTarget.response;
                    }
                });
                messageModal.showSpinner = false;
                this.reloadData();
            } catch (e) {
                (<typeof MessageModal> this.$refs.message).show('"docker-compose build" failed', 'Command failed');
            }
            this.dockerComposeExecuting = false;
        },
        dockerComposeLogsWatch() {
            const ws = WebSocketClient(endpoints.stack.docker_compose.logs.url);

            const messageModal = <typeof MessageModal> this.$refs.message;
            messageModal.showConsole('Logs');
            messageModal.onClosed = () => {
                ws.close();
            };
            ws.onopen = (ev: Event) => {
                ws.send(JSON.stringify(<endpoints.stack.docker_compose.logs.param> {
                    token: ws.token,
                    stack_name: this.name,
                }));
            };
            ws.onmessage = (event: MessageEvent<any>) => {
                messageModal.consoleOutput += event.data;
            };
        },
        showSnapshotCreateDialog() {
            this.createSnapshotModal.model = {
                dataset: this.data.zfs_dataset!.name,
                name: generateSnapshotName('manual')
            }

            this.createSnapshotModal.modal.show();
        },
        async showComposeFileClicked(snapshot?: string) {
            (<typeof DockerComposeFile> this.$refs.composeFile).showComposeFile(snapshot ? 'view' : 'editor', snapshot);
        },
        async diffComposeFileClicked(snapshot: string) {
            (<typeof DockerComposeFile> this.$refs.composeFile).showComposeFile('diff', snapshot);
        },
        async createSnapshot(name: string) {
            if (this.data.zfs_dataset) {
                await ApiClient().post(endpoints.snapshot.create.url, <endpoints.snapshot.create.req_type> {
                    dataset: this.data.zfs_dataset.name,
                    name: name
                });

                await this.updateSnapshots();
            } else {
                throw Error('Dataset not available');
            }
        },
        async createSnapshotBtnClicked() {
            this.createSnapshotModal.state = 'creating';
            try {
                await this.createSnapshot(this.createSnapshotModal.model.name);
                this.createSnapshotModal.state = 'idle';
                this.createSnapshotModal.modal.hide();
            } catch (e) {
                const resp = <endpoints.snapshot.create.error_resp_type> (<AxiosError> e).response?.data;
                this.createSnapshotModal.error_message = resp.message;
                this.createSnapshotModal.state = 'error';
            }
        },
        cloneSnapshotClicked(snapshot: string) {
            (<typeof StackSnapshotClone> this.$refs.stackSnapshotClone).show(snapshot);
        },
        rollbackSnapshotClicked(snapshot: string) {
            const messageModal = <typeof MessageModal> this.$refs.message;
            messageModal.showYesNo('Confirm',
                `Restore snapshot "${snapshot}"? This will destroy the dataset's current contents.`,
                async () => {
                    await this.dockerComposeDown();
                    await ApiClient().post<any, any, endpoints.snapshot.rollback.req_type>(endpoints.snapshot.rollback.url, {
                        dataset_path: this.data.zfs_dataset!.name,
                        snapshot_name: snapshot
                    });
                    await this.dockerComposeUp();
                });
        },
        removeSnapshotClicked(snapshot: string) {
            const messageModal = <typeof MessageModal> this.$refs.message;
            messageModal.showYesNo('Confirm',
                `Remove snapshot "${snapshot}"?`,
                async () => {
                    await ApiClient().post<any, any, endpoints.snapshot.remove.req_type>(endpoints.snapshot.remove.url, {
                        dataset_path: this.data.zfs_dataset!.name,
                        snapshot_name: snapshot
                    });
                    await this.updateSnapshots();
                });
        },
        containerStatusColor: containerStatusColor
    },
    computed: {
        composeFileLoading() {
            return (<typeof DockerComposeFile> this.$refs.composeFile).loading;
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
span.badge {
    cursor: default;
}
</style>
