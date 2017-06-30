var assert = require('assert');
var cp = require('child_process');
var which = require('which');
var attach = require('../promise');

for (var k in assert) global[k] = assert[k];

try {
  which.sync('nvim');
} catch (e) {
  console.error('A Neovim installation is required to run the tests',
                '(see https://github.com/neovim/neovim/wiki/Installing)');
  process.exit(1);
}

describe('Nvim Promise API', function() {
  var nvim, requests, notifications;

  before(function() {
    nvim = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
      cwd: __dirname
    });

    return attach(nvim.stdin, nvim.stdout).then(function(n) {
      nvim = n;
      nvim.on('request', function(method, args, resp) {
        requests.push({method: method, args: args});
        resp.send('received ' + method + '(' + args + ')');
      });
      nvim.on('notification', function(method, args) {
        notifications.push({method: method, args: args});
      });
    });
  });

  beforeEach(function() {
    requests = [];
    notifications = [];
  });

  it('can send requests and receive response', function() {
    return nvim.eval('{"k1": "v1", "k2": 2}').then(function(res) {
      deepEqual(res, {k1: 'v1', k2: 2});
    });
  });

  it('can receive requests and send responses', function() {
    return nvim.eval('rpcrequest(1, "request", 1, 2, 3)').then(function(res) {
      equal(res, 'received request(1,2,3)');
      deepEqual(requests, [{method: 'request', args: [1, 2, 3]}]);
      deepEqual(notifications, []);
    });
  });

  it('can receive notifications', function() {
    return nvim.eval('rpcnotify(1, "notify", 1, 2, 3)').then(function(res) {
      equal(res, 1);
      deepEqual(requests, []);
      setImmediate(function() {
        deepEqual(notifications, [{method: 'notify', args: [1, 2, 3]}]);
      });
    });
  });

  it('can deal with custom types', function() {
    return nvim.command('vsp').then(function(res) {
      return nvim.listWins().then(function(windows) {
        equal(windows.length, 2);
        // equal(windows[0] instanceof nvim.Window, true);
        // equal(windows[1] instanceof nvim.Window, true);
        return nvim.setCurrentWin(windows[1]).then(function(res) {
          return nvim.getCurrentWin().then(function(win) {
            equal(win._data, windows[1]._data);
            return nvim.getCurrentBuf().then(function(buf) {
              // equal(buf instanceof nvim.Buffer, true);
              return buf.getLineSlice(0, -1, true, true).then(function(lines) {
                deepEqual(lines, ['']);
                return buf.setLineSlice(0, -1, true, true, ['line1', 'line2']).then(function() {
                  return buf.getLineSlice(0, -1, true, true).then(function(lines) {
                    deepEqual(lines, ['line1', 'line2']);
                  });
                });
              });
            });
          });
        });
      });
    });

  });

  it('emits "disconnect" after quit', function(done) {
    nvim.on('disconnect', done);
    nvim.quit();
  });
});
