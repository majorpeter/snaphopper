<template>
<div class="modal" id="messageModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{{ title }}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div v-if="html" v-html="html"></div>
        <p v-else>{{ text }}</p>
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

export default defineComponent({
    data() {
        return {
            title: '',
            text: '',
            html: '',
            modal: <Modal> {}
        }
    },
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('messageModal'), {});
    },
    methods: {
        show(title: string, text: string) {
            this.title = title;
            this.text = text;
            this.html = '';

            this.modal.show();
        },
        showHtml(title: string, html: string) {
            this.title = title;
            this.text = '';
            this.html = html;

            this.modal.show();
        }
    }
});
</script>
