<template>
    <template v-if="serviceData.existing_image">
            <template v-if="serviceData.existing_image.url">
                <a :href="serviceData.existing_image.url" :title="serviceData.existing_image.id" target="_blank">{{ serviceData.existing_image.name }}</a>
                <UpdateCheckBadge :image_name="serviceData.existing_image.name" :id="serviceData.existing_image.id" :digest="serviceData.existing_image.digest"></UpdateCheckBadge>
            </template>
            <template v-else>
                <span :title="serviceData.existing_image.id">{{ serviceData.existing_image.name }}</span> <strong>(custom)</strong><br/>
                <strong>from</strong> <a :href="serviceData.existing_image.base_url!" target="_blank">{{ serviceData.existing_image.base }}</a>
                <a class="badge bg-info ms-2" v-if="serviceData.dockerfile_image?.custom_build=='git'" @click="pullGit" title="Pull from git" href="#">
                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" v-if="pullInProgress"></span>
                    Git
                </a>
            </template>

            <span class="badge bg-info ms-2" v-if="serviceData.dockerfile_image?.name && serviceData.dockerfile_image.name != serviceData.existing_image.name" title="Docker compose file changed since this container was created.">
            Config changed
            </span>
        </template>
        <template v-else-if="serviceData.dockerfile_image?.name">
            <a :href="serviceData.dockerfile_image.url" target="_blank" :title="serviceData.dockerfile_image.id">{{ serviceData.dockerfile_image?.name }}</a>
            <UpdateCheckBadge v-if="serviceData.dockerfile_image.id" :image_name="serviceData.dockerfile_image.name" :id="serviceData.dockerfile_image.id" :digest="serviceData.dockerfile_image.digest"></UpdateCheckBadge>
            <span v-else class="badge bg-info ms-2">Not available</span>
        </template>
        <span v-else>custom</span>
</template>

<script lang="ts">
import UpdateCheckBadge from '@/components/UpdateCheckBadge.vue';
import { endpoints } from '@api';
import { PropType, defineComponent } from 'vue';
import MessageModal from './MessageModal.vue';
import ApiClient from '@/services/ApiClient';

export default defineComponent({
    components: {
        UpdateCheckBadge
    },
    data() {
        return ({
            pullInProgress: false
        });
    },
    props: {
        stackName: {
            type: String,
            required: true
        },
        serviceName: {
            type: String,
            required: true
        },
        serviceData: {
            type: Object as PropType<endpoints.ServiceData>,
            required: true
        },
        messageModal: {
            type: Object as PropType<unknown>   // should be MessageModal but the linter doesn't support it
        },
    },
    methods: {
        async pullGit() {
            if (this.pullInProgress || !this.messageModal) {
                return;
            }

            this.pullInProgress = true;
            const messageModal = <typeof MessageModal> this.messageModal;
            messageModal.showConsole('Git pull');

            messageModal.showSpinner = true;
            try {
                await ApiClient().post(endpoints.stack.git.url.replace(':name', <string> this.stackName), <endpoints.stack.git.post_req_type> {
                    service_name: this.serviceName
                }, {
                    onDownloadProgress(progressEvent) {
                        messageModal.consoleOutput = progressEvent.event.currentTarget.response;
                    }
                });
                messageModal.showSpinner = false;
            } catch (e) {
                messageModal.showSpinner = false;
                messageModal.show('"git pull" failed', 'Command failed');
            }
            this.pullInProgress = false;
        }
    }
});
</script>
