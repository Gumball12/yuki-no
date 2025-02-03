import shell, { type ExecOptions } from 'shelljs';

shell.config.silent = true;

export class Git {
  exec(command: string, execOptions: ExecOptions = {}) {
    return shell.exec(`git ${command}`, execOptions);
  }

  config(prop: string, value: string) {
    return this.exec(`config ${prop} ${value}`);
  }

  clone(userName: string, token: string, url: string, name: string) {
    url = url.replace('https://', `https://${userName}:${token}@`);

    return this.exec(`clone ${url} ${name}`);
  }

  addRemote(url: string, name: string) {
    return this.exec(`remote add ${name} ${url}`);
  }

  fetch(repo: string, branch: string) {
    return this.exec(`fetch ${repo} ${branch}`);
  }
}
