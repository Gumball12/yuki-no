import { spawn } from 'child_process';

export interface RunActionOptions {
  command?: string;
  args?: string[];
}

export const runAction = async (
  envOverrides: Record<string, string> = {},
  options: RunActionOptions = {},
): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
  const { command = 'yarn', args = ['start'] } = options;
  const env = { ...process.env, ...envOverrides };

  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const child = spawn(command, args, {
      env,
      cwd: process.cwd(),
      shell: true,
    });

    child.stdout?.on('data', data => {
      const str = data.toString();
      stdout.push(str);
      console.log('[ACTION]', str.trim());
    });

    child.stderr?.on('data', data => {
      const str = data.toString();
      stderr.push(str);
      console.error('[ACTION ERROR]', str.trim());
    });

    child.on('error', error => {
      reject(error);
    });

    child.on('close', code => {
      resolve({
        exitCode: code || 0,
        stdout: stdout.join(''),
        stderr: stderr.join(''),
      });
    });
  });
};
