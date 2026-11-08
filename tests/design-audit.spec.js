import { test, _electron as electron } from '@playwright/test';

test('capture Electron application UI', async () => {
  // VS Code's terminal sets ELECTRON_RUN_AS_NODE=1, which makes Electron start as plain Node
  // and fail with "bad option: --remote-debugging-port=0". Launch without it.
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = await electron.launch({
    args: ['.'], // Adjust to your Electron entry point
    env
  });

  try {
    const window = await app.firstWindow();

    await window.screenshot({
      path: 'screenshots/dashboard.png',
      fullPage: true
    });

    // Add navigation steps to capture other screens.
  } finally {
    await app.close();
  }
});
