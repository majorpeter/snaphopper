<template>
<div class="modal fade" :class="modalClass" id="messageModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          {{ title }}
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="showSpinner"></span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div v-if="html" v-html="html"></div>
        <p v-else>{{ text }}</p>
        <textarea ref="consoleView" class="form-control" v-if="consoleOutput!==null" readonly></textarea>
      </div>
      <div class="modal-footer text-center">
        <template v-if="mode=='yesno'">
          <button type="button" class="btn btn-primary" @click="onYesClicked">Yes</button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
        </template>
        <button v-else type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
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
            showSpinner: false,
            mode: <'message'|'yesno'> 'message',
            consoleOutput: <string|null> null,
            modal: <Modal> {},
            onYesClicked: () => {},
            onClosed: () => {}
        }
    },
    mounted() {
        this.modal = new Modal(<Element> document.getElementById('messageModal'), {});
        (<Element> document.getElementById('messageModal')).addEventListener('hidden.bs.modal', () => {
          this.onClosed();
        });
    },
    methods: {
        reset() {
            this.title = '';
            this.text = '';
            this.html = '';
            this.consoleOutput = null;
            this.mode = 'message';
        },
        show(title: string, text: string) {
            this.reset()

            this.title = title;
            this.text = text;

            this.modal.show();
        },
        showHtml(title: string, html: string) {
            this.reset();
            this.title = title;
            this.html = html;

            this.modal.show();
        },
        showConsole(title: string) {
            this.reset();
            this.title = title;
            this.consoleOutput = '';

            this.modal.show();
        },
        showYesNo(title: string, text: string, yesCallback: () => Promise<void>) {
            this.reset();
            this.title = title;
            this.text = text;
            this.mode = 'yesno';

            this.onYesClicked = async () => {
              await yesCallback();
              this.modal.hide();
            };

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
div.modal-footer {
  justify-content: center;
}

textarea {
  height: 600px;
  font-family: monospace;
}
</style>
