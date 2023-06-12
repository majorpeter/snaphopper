<template>
<div class="modal" :class="modalClass" id="messageModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">{{ title }}</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div v-if="html" v-html="html"></div>
        <p v-else>{{ text }}</p>
        <textarea ref="consoleView" class="form-control" v-if="consoleOutput!==null" readonly></textarea>
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
            consoleOutput: <string|null> null,
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
            this.consoleOutput = null;

            this.modal.show();
        },
        showHtml(title: string, html: string) {
            this.title = title;
            this.text = '';
            this.html = html;
            this.consoleOutput = null;

            this.modal.show();
        },
        showConsole(title: string) {
            this.title = title;
            this.text = '';
            this.html = '';
            this.consoleOutput = '';

            this.modal.show();
        }
    },
    computed: {
      modalClass() {
        return this.consoleOutput !== null ? 'modal-lg' : '';
      }
    },
    watch: {
      consoleOutput() {
        const view = <HTMLTextAreaElement|undefined> this.$refs.consoleView;
        if (view) {
          view.textContent = this.consoleOutput;
          view.scrollTop = view.scrollHeight;
        }
      }
    }
});
</script>

<style scoped>
textarea {
  height: 600px;
  font-family: monospace;
}
</style>
