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
                <HighCode ref="highcode" :textEditor="true" lang="yaml" theme="light" :copy="false" :nameShow="false" borderRadius="0" width="100%" height="400px"></HighCode>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" @click="snapshotSaveApply" v-if="mode=='editor'" :disabled="highcode?.modelValue==saved_content || state=='saving'">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="state=='saving'"></span>
                    Snapshot, Save & Apply
                </button>
                <button type="button" class="btn btn-primary" @click="save" v-if="mode=='editor'" :disabled="highcode?.modelValue==saved_content || state=='saving'">
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="state=='saving'"></span>
                    Save
                </button>
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="state=='saving' || !canClose">Close</button>
            </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { PropType, defineComponent, ref } from 'vue';
import { Modal } from 'bootstrap';
import { HighCode } from 'vue-highlight-code';
import { createPatch } from "diff";
import { endpoints } from '@api';
import ApiClient from '@/services/ApiClient';

import { generateSnapshotName } from '../Stack.vue'
import 'vue-highlight-code/dist/style.css';

type Mode = 'editor'|'view'|'diff';

export default defineComponent({
    props: {
        name: String,
        filepath: String,
        canClose: Boolean,
        createSnapshot: Function as PropType<(name: string) => Promise<void>>,
        composeUp: Function as PropType<() => Promise<void>>
    },
    components: {
        HighCode
    },
    emits: {
        'compose-file-changed': null
    },
    data() {
        return {
            modal: <Modal> {},
            saved_content: '',
            mode: <Mode> 'editor',
            state: <'hidden'|'loading'|'idle'|'saving'|'save_error'> 'hidden'
        }
    },
    setup() {
        const highcode = ref<HighCode>();
        return {highcode};
    },
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('composeFileModal'), {backdrop: 'static', keyboard: false});
    },
    methods: {
        async showComposeFile(mode: Mode, snapshot?: string) {
            this.mode = mode;

            this.state = 'loading';
            let url = endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name);
            if (snapshot) {
                url += '?' + new URLSearchParams({snapshot} satisfies endpoints.stack.docker_compose_file.query_type);
            }
            this.saved_content = <endpoints.stack.docker_compose_file.get_resp_type> (await ApiClient().get(url)).data;

            if (mode != 'diff') {
                this.highcode!.modelValue = this.saved_content
            } else {
                let url = endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name);
                let current_file = <endpoints.stack.docker_compose_file.get_resp_type> (await ApiClient().get(url)).data;
                this.highcode!.modelValue = createPatch(this.filepath!, this.saved_content, current_file, '@' + snapshot, '(current)');
            }

            this.modal.show();
            this.state = 'idle';
        },
        async save() {
            this.state = 'saving';
            try {
                await ApiClient().post(endpoints.stack.docker_compose_file.url.replace(':name', <string> this.name), <endpoints.stack.docker_compose_file.post_req_type> {content: this.highcode!.modelValue});
                this.state = 'idle';
                this.saved_content = this.highcode!.modelValue;
                this.$emit('compose-file-changed');
            } catch (e) {
                this.state = 'save_error';
            }
        },
        async snapshotSaveApply() {
            this.$data.state = 'saving';    // $data is required not to confuse TS with the comparison below

            await this.createSnapshot!(generateSnapshotName('compose'));
            await this.save();

            if (this.state != 'save_error') {
                this.composeUp!();
            }
        }
    }
});
</script>
