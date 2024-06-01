<template>
<div class="modal fade" :class="modalClass" id="messageModal" tabindex="-1">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">
          {{ title }}
          <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="showSpinner"></span>
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" :disabled="busy"></button>
      </div>
      <div class="modal-body">
        <div v-if="html" v-html="html"></div>
        <p v-else>{{ text }}</p>
        <div ref="consoleView" class="form-control" id="textarea" v-if="consoleOutput!==null" readonly></div>
      </div>
      <div class="modal-footer text-center">
        <template v-if="mode=='yesno'">
          <button type="button" class="btn btn-primary" @click="onYesClicked" :disabled="busy">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="busy"></span>
            Yes
          </button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" :disabled="busy">No</button>
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
import { AnsiUp } from 'ansi_up';

export default defineComponent({
    data() {
        return {
            title: '',
            text: '',
            html: '',
            showSpinner: false,
            mode: <'message'|'yesno'> 'message',
            busy: false,
            consoleOutput: <string|null> null,
            modal: <Modal> {},
            onYesClicked: () => {},
            onClosed: () => {},
            ansiUp: new AnsiUp()
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
            this.busy = false;
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
              this.busy = true;
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
        const view = <HTMLDivElement|undefined> this.$refs.consoleView;
        if (view) {
          view.innerHTML = this.ansiUp.ansi_to_html(this.consoleOutput!).replace(/\n/g, '<br/>');
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

div#textarea {
  height: 600px;
  font-family: monospace;
  overflow: auto;
}
</style>
