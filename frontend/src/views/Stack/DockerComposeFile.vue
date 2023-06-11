<template>
    <div class="modal modal-lg fade" id="composeFileModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
            <div class="modal-header">
                <h1 class="modal-title fs-5">{{  filepath }}</h1>
            </div>
            <div class="modal-body">
                <div class="alert alert-danger fade show" role="alert" v-if="saved_content.length==0">
                    Cannot access <code>{{ filepath }}</code> or file is empty.
                </div>
                <div class="alert alert-danger alert-dismissible fade show" role="alert" v-if="state=='save_error'">
                    Could not save <code>{{ filepath }}</code>.
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" @click="state='idle'"></button>
                </div>
                <textarea class="form-control" id="composeFileYaml" v-model="content"></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" @click="save" :disabled="content==saved_content || state=='saving'">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="state=='saving'"></span>
                    Save
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="state=='saving'">Close</button>
            </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Modal } from 'bootstrap';
import { endpoints } from '@api';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
    props: {
        name: String,
        filepath: String
    },
    data() {
        return {
            modal: <Modal> {},
            saved_content: '',
            content: '',
            state: <'hidden'|'loading'|'idle'|'saving'|'save_error'> 'hidden'
        }
    },
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('composeFileModal'), {backdrop: 'static', keyboard: false});
    },
    methods: {
        async showComposeFile() {
            this.state = 'loading';
            this.content = this.saved_content = <endpoints.stack.docker_compose_file.get_resp_type> (await ApiClient().get(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name))).data;

            this.modal.show();
            this.state = 'idle';
        },
        async save() {
            this.state = 'saving';
            try {
                await ApiClient().post(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose_file.post_req_type> {content: this.content});
                this.state = 'idle';
            } catch (e) {
                this.state = 'save_error';
            }
        }
    }
});
</script>

<style scoped>
textarea#composeFileYaml {
    height: 400px;
    font-family: monospace;
}
</style>
