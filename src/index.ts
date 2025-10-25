import { start as startApp } from './app';
import { log } from './utils';

import shell from 'shelljs';

shell.config.silent = true;

// Keep entrypoint behavior: delegate to app.start()
const start = async () => {
  const startTime = new Date();
  log('I', `Starting Yuki-no (${startTime.toISOString()})`);

  await startApp();

  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  log(
    'S',
    `Yuki-No completed (${endTime.toISOString()}) - Duration: ${duration}s`,
  );
};

start();
