<template>
    <form @submit.prevent="submit">
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

            <button type="submit" class="btn btn-primary">Submit</button>
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
      loaded: false
    };
  },
  methods: {
    async submit() {
        await axios.post(API_PREFIX + endpoints.config.url, this.config);
    }
  },
  async created() {
    this.config = (await axios.get(API_PREFIX + endpoints.config.url)).data;
    this.loaded = true;
  }
});
</script>
