<template>
    <h2><img src="@/svg/operations-icon.svg" class="d-inline-block align-middle"/> Configuration</h2>

    <form @submit.prevent="submit">
        <div class="alert alert-success alert-dismissible fade show" role="alert" v-if="saved">
          Configuration successfully saved!
          <button type="button" class="btn-close" aria-label="Close" @click="saved=false"></button>
        </div>

        <div class="alert alert-danger show" role="alert" v-if="error">
            Configuration could not be saved.
        </div>

        <fieldset :disabled="!loaded">
            <div class="form-group row mb-2">
                <label for="portNumber" class="col-sm-3 col-form-label">Listening port number</label>
                <div class="col-sm-3">
                    <input type="number" class="form-control" id="portNumber" placeholder="port" v-model="config.port"/>
                </div>
            </div>

            <div class="form-group row mb-2">
                <label class="col-sm-3" for="sshUser">SSH user & host</label>
                <div class="col-sm-2 pe-0">
                    <input type="text" class="form-control" id="sshUser" placeholder="user" v-model="config.ssh_username"/>
                </div>
                <div class="col-sm-3 ps-0">
                    <div class="input-group">
                        <div class="input-group-prepend">
                            <span class="input-group-text" id="inputGroupPrepend">@</span>
                        </div>
                        <input type="text" class="form-control" id="sshHost" placeholder="hostname" v-model="config.ssh_host"/>
                    </div>
                </div>
            </div>

            <div class="form-group row mb-2">
                <label class="col-sm-3" for="sshPrivKeyPath">SSH private key path</label>
                <div class="col-sm-9">
                    <input type="text" class="form-control" id="sshPrivKeyPath" placeholder="~/.ssh/id_rsa" v-model="config.ssh_privkey_path"/>
                <div class="form-text">Subject to change: Should be an upload form.</div>
                </div>
            </div>

            <button type="submit" class="btn btn-primary" :disabled="saving">
                <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" v-if="saving"></span>
                Submit
            </button>
    </fieldset>
    </form>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import axios from "axios";
import { API_PREFIX } from '../js/util';
import { endpoints } from '@api';

export default defineComponent({
  data() {
    return {
      config: <endpoints.config.type> {},
      loaded: false,
      saving: false,
      saved: false,
      error: false
    };
  },
  methods: {
    async submit() {
        this.saving = true;
        this.saved = this.error = false;

        try {
            await axios.post(API_PREFIX + endpoints.config.url, this.config);
            this.saved = true;
        } catch (e) {
            this.error = true;
        } finally {
            this.saving = false;
        }
    }
  },
  async created() {
    this.config = (await axios.get(API_PREFIX + endpoints.config.url)).data;
    this.loaded = true;
  }
});
</script>
