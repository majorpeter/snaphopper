<template>
<span class="badge bg-primary ms-2" @click="" v-if="data?.state=='outdated'" :title="data.latest_hash">Update</span>
<span class="badge bg-warning ms-2" @click="" v-if="data?.state=='error'">Error</span>
<span class="spinner-border spinner-border-sm text-primary ms-2" role="status" aria-hidden="true" v-else-if="!data"></span>
</template>

<script lang="ts">
import ApiClient from '@/services/ApiClient';
import { endpoints } from '@api';
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        image_name: String,
        id: String,
        digest: String
    },
    data() {
        return {
            data: <endpoints.updates.resp_type | undefined> undefined
        }
    },
    mounted() {
        this.checkUpdate();
    },
    methods: {
        async checkUpdate() {
            this.data = (<endpoints.updates.resp_type> (await ApiClient().get(endpoints.updates.url, {
            params: <endpoints.updates.query> {
                image_name: this.image_name,
                id: this.id,
                digest: this.digest
            }
        })).data);
        }
    },
    watch: {
        // fetch again if docker-compose file was edited
        id(_newVal, _oldVal) {
            this.checkUpdate();
        }
    }
});
</script>

<style scoped>
span.badge {
    cursor: default;
}
</style>
