import attach, {Window} from '..';
import * as cp from 'child_process';

const nvim_proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {});
attach(nvim_proc.stdin, nvim_proc.stdout, (err, nvim) => {

  if (err) {
      console.error(err);
      return;
  }

  nvim.on('request', (method: string, args: Object[], resp: Object) => {
    // handle msgpack-rpc request
  });

  nvim.on('notification', (method: string, args: Object[]) => {
    // handle msgpack-rpc notification
  });

  nvim.on('disconnect', () => {
    console.log("Nvim exited!");
  });

  nvim.command('vsp', (err) => {
    nvim.getWindows((err, windows) => {
      console.log(windows.length);  // 2
      console.log(windows[0] instanceof Window); // true
      console.log(windows[1] instanceof Window); // true
      nvim.setCurrentWindow(windows[1], (err) => {
        nvim.getCurrentWindow((err, win) => {
          console.log(win.equals(windows[1]))  // true
          nvim.quit();
        });
      });
    });
  });
});
