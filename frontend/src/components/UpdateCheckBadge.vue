<template>
<span class="badge bg-primary ms-2" @click="" v-if="status=='outdated'">Update</span>
<span class="badge bg-warning ms-2" @click="" v-if="status=='error'">Error</span>
<span class="spinner-border spinner-border-sm text-primary ms-2" role="status" aria-hidden="true" v-else-if="status=='unknown'"></span>
</template>

<script lang="ts">
import ApiClient from '@/services/ApiClient';
import { endpoints } from '@api';
import { defineComponent } from 'vue';

export default defineComponent({
    props: {
        image_name: String,
        current_hash: String
    },
    data() {
        return {
            status: <endpoints.updates.resp_type['state'] | 'unknown'> 'unknown'
        }
    },
    async mounted() {
        this.status = (<endpoints.updates.resp_type> (await ApiClient().get(endpoints.updates.url, {
            params: <endpoints.updates.query> {
                image_name: this.image_name,
                current_hash: this.current_hash
            }
        })).data).state;
    }
});
</script>

<style scoped>
span.badge {
    cursor: default;
}
</style>
