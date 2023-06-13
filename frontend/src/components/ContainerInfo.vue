<template>
    <template v-if="serviceData.existing_image">
            <template v-if="serviceData.existing_image.url">
                <a :href="serviceData.existing_image.url" :title="serviceData.existing_image.id" target="_blank">{{ serviceData.existing_image.name }}</a>
                <UpdateCheckBadge :image_name="serviceData.existing_image.name" :id="serviceData.existing_image.id" :digest="serviceData.existing_image.digest"></UpdateCheckBadge>
            </template>
            <template v-else>
                <span :title="serviceData.existing_image.id">{{ serviceData.existing_image.name }}</span> <strong>(custom)</strong><br/>
                <strong>from</strong> <a :href="serviceData.existing_image.base_url!" target="_blank">{{ serviceData.existing_image.base }}</a>
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

export default defineComponent({
    props: {
        serviceData: {
            type: Object as PropType<endpoints.ServiceData>,
            required: true
        },
    },
    components: {
        UpdateCheckBadge
    }
});
</script>
