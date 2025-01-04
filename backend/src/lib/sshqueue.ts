import { NodeSSH, SSHExecCommandResponse } from "node-ssh";
import { ClientChannel } from "ssh2";
import { setTimeout } from "timers/promises";

/**
 * this wrapper class makes SSH access "single threaded"
 * @note this fixes the errors when too many channels are opened on the same SSH connection (CHANNEL_OPEN_FAILURE in ssh2 lib)
 */
export class SshQueue {
  private readonly ssh: NodeSSH;
  private pending: Promise<any> = Promise.resolve();
  private channelBusy = false;

  constructor() {
    this.ssh = new NodeSSH();
  }

  async connect(params: {
    host: string;
    username: string;
    privateKey: string;
  }) {
    return this.ssh.connect(params);
  }

  /**
   * run a command via SSH and wait for any pending command
   * @param command command to run, e.g. 'docker'
   * @param args array of command arguments
   * @param options same as NodeSSH options
   * @returns stdout of successful command or 'null' on error
   */
  async exec(
    command: string,
    args: string[],
    options?: {
      stdin?: string;
      working_dir?: string;
      cwd?: string;
      onStdout?: (chunk: Buffer) => void;
      onStderr?: (chunk: Buffer) => void;
    }
  ): Promise<string | null> {
    const task = new Promise<string | null>(async (resolve) => {
      try {
        await this.pending;
        resolve(await this.ssh.exec(command, args, options));
      } catch (e) {
        // have to resolve in order for the Promise chain to work after error
        resolve(null);
      }
    });
    this.pending = task;
    return task;
  }

  async execStream(
    command: string,
    args: string[],
    options: {
      stdin?: string;
      working_dir?: string;
      cwd?: string;
      stream: "both";
      onStdout?: (chunk: Buffer) => void;
      onStderr?: (chunk: Buffer) => void;
    }
  ): Promise<SSHExecCommandResponse> {
    const task = new Promise<SSHExecCommandResponse>(async (resolve) => {
      await this.pending;
      resolve(this.ssh.exec(command, args, options));
    });
    this.pending = task;
    return task;
  }

  async executeWithShell(
    command_line: string,
    onStdout: (chunk: Buffer) => void
  ): Promise<(() => void) | null> {
    if (this.channelBusy) {
      return null;
    }

    this.channelBusy = true;
    const channel = await this.ssh.requestShell({
      modes: {
        ECHO: 0, // do not echo the command we send
      },
    });
    await setTimeout(500);

    channel.read(); // read everything from shell before actual command output
    channel.write(command_line + "\n");
    const periodic = setInterval(() => {
      if (channel.readableLength > 0) {
        onStdout(channel.read());
      }
    }, 500);

    return () => {
      clearInterval(periodic);
      channel.destroy();
      this.channelBusy = false;
    };
  }
}
