<template>
<p class="h3">{{ name }}</p>

<p class="h4">Services</p>

<p class="h4">Snapshots</p>

<div class="accordion" id="snapshotList">
    <div class="accordion-item" v-for="(data, name) in snapshots">
    <h4 class="accordion-header" :id="'collapsehead_'+name">
        <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="'#collapse_'+name" aria-expanded="false" :aria-controls="'collapse_'+name">
        {{ name }}
        </button>
    </h4>
    <div :id="'collapse_'+name" class="accordion-collapse collapse" :aria-labelledby="'collapsehead_'+name" data-bs-parent="#snapshotList">
        <div class="accordion-body">
        Todo: <strong>details, actions</strong>
        </div>
    </div>
    </div>
</div>

</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
    data() {
        return {
            name: this.$route.params.name,
            snapshots: {
                'auto-2023-06-06': {},
                'auto-2023-06-05': {},
                'auto-2023-06-04': {},
                'auto-2023-06-03': {}
            }
        }
    }
});
</script>