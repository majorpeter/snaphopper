<template>
<div class="modal fade" id="modal" ref="modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Clone snapshot to new dataset</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="state=='cloning'"></button>
      </div>
      <div class="modal-body">
        Clone selected snapshot into a new dataset.
        <div class="alert alert-danger fade show" role="alert" v-if="state=='error'">
            Failed to create dataset:
            <ul><li>{{ error_message }}</li></ul>
        </div>

        <form>
          <div class="mb-3">
            <label for="datasetName" class="col-form-label">Dataset:</label>
            <input type="text" class="form-control" id="datasetName" readonly v-model="datasetName"/>
          </div>
          <div class="mb-3">
            <label for="snapshotName" class="col-form-label">Snapshot name:</label>
            <input class="form-control" id="snapshotName" v-model="model.snapshotName" readonly/>
          </div>
          <div class="mb-3">
            <label for="newDatasetName" class="col-form-label">New dataset name:</label>
            <input class="form-control" id="newDatasetName" v-model="model.cloneDatasetName" :readonly="state=='cloning'"/>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="state=='cloning'">Close</button>
        <button type="button" class="btn btn-primary" :disabled="state=='cloning'" @click="onAccepted">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="state=='cloning'"></span>
            Clone
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Modal } from 'bootstrap';
import { AxiosError } from 'axios';
import { endpoints } from '@api';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('modal'), {
            backdrop: 'static',
            keyboard: false
        });
    },
    data() {
        return {
            modal: <Modal> {},
            state: <'idle'|'cloning'|'error'> 'idle',
            model: {
                cloneDatasetName: '',
                snapshotName: ''
            },
            error_message: ''
        };
    },
    props: {
        datasetName: String
    },
    methods: {
        show(snapshotName: string) {
            this.state = 'idle';
            this.model.snapshotName = snapshotName;
            this.model.cloneDatasetName = this.datasetName + '_copy';

            this.modal.show();
        },
        async onAccepted() {
            this.state = 'cloning';
            try {
                await ApiClient().post(endpoints.snapshot.clone.url, <endpoints.snapshot.clone.req_type> {
                    dataset_path: this.datasetName,
                    snapshot_name: this.model.snapshotName,
                    clone_path: this.model.cloneDatasetName
                });
                this.state = 'idle';
                this.modal.hide();
            } catch (e) {
                const resp = <endpoints.snapshot.clone.error_resp_type> (<AxiosError> e).response?.data;
                this.error_message = resp.message;
                this.state = 'error';
            }
        }
    }
});
</script>
