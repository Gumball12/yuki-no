import shell, { type ExecOptions } from 'shelljs';

shell.config.silent = true;

export class Git {
  exec(command: string, execOptions: ExecOptions = {}) {
    return shell.exec(`git ${command}`, execOptions);
  }

  config(prop: string, value: string) {
    return this.exec(`config ${prop} ${value}`);
  }

  clone(
    userName: string,
    token: string,
    url: string,
    name: string,
    dir?: string,
  ) {
    url = url.replace('https://', `https://${userName}:${token}@`);

    const options: ExecOptions = {};
    if (dir) {
      shell.mkdir(dir);
      options.cwd = dir;
    }

    return this.exec(`clone ${url} ${name}`, options);
  }

  addRemote(url: string, name: string) {
    return this.exec(`remote add ${name} ${url}`);
  }

  fetch(repo: string, branch: string) {
    return this.exec(`fetch ${repo} ${branch}`);
  }
}
