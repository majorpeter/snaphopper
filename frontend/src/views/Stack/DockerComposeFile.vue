<template>
    <div class="modal modal-lg fade" id="composeFileModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
            <div class="modal-header">
                <h1 class="modal-title fs-5">{{  filepath }}</h1>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="alert alert-danger alert-dismissible fade show" role="alert" v-if="content.length==0">
                    Cannot access <code>{{ filepath }}</code> or file is empty.
                </div>
                <textarea class="form-control" readonly id="composeFileYaml">{{ content }}</textarea>
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
            content: <string> '',
            loading: false
        }
    },
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('composeFileModal'));
    },
    methods: {
        async showComposeFile() {
            this.loading = true;
            this.content = <endpoints.stack.docker_compose_file.resp_type> (await ApiClient().get(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name))).data;
            this.loading = false;

            this.modal.show();
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
