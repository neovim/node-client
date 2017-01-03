
import * as cp from 'child_process'
import * as which from 'which'
import attach = require('./index')
import { expect } from "chai"

try {
  which.sync('nvim');
} catch (e) {
  console.error('A Neovim installation is required to run the tests',
                '(see https://github.com/neovim/neovim/wiki/Installing)');
  process.exit(1);
}

describe('a Neovim client', function() {

  let nvim, requests, notifications;

  before(async function() {

    const p = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
      cwd: __dirname
    })

    nvim = await attach(p.stdin, p.stdout)
  
    nvim.on('request', function(method, args, resp) {
      requests.push({method: method, args: args});
      resp.send('received ' + method + '(' + args + ')')
    })

    nvim.on('notification', function(method, args) {
      notifications.push({method: method, args: args})
    })

  });

  beforeEach(function() {
    requests = []
    notifications = []
  });

  it('can send requests and receive response', async function() {
    const res = await nvim.eval('{"k1": "v1", "k2": 2}')
    expect(res).to.deep.equal({k1: 'v1', k2: 2})
  })

  it('can receive requests and send responses', async function() {
    const res = await nvim.eval('rpcrequest(1, "request", 1, 2, 3)')
    expect(res).to.equal('received request(1,2,3)')
    expect(requests).to.deep.equal([{method: 'request', args: [1, 2, 3]}])
    expect(notifications).to.be.empty
  })

  it('can receive notifications', async function() {
    const res = await nvim.eval('rpcnotify(1, "notify", 1, 2, 3)')
    expect(res).to.equal(1)
    expect(requests).to.be.empty
    return new Promise((accept, reject) => {
      setImmediate(function() {
        expect(notifications).to.deep.equal([{method: 'notify', args: [1, 2, 3]}])
        accept()
      })
    });
  });

  it('can deal with custom types', async function() {
    await nvim.command('vsp')
    const windows = await nvim.getWindows()
    expect(windows).to.have.lengthOf(2)
    expect(windows[0]).to.be.an.instanceof(nvim.Window)
    expect(windows[1]).to.be.an.instanceof(nvim.Window)
    await nvim.setCurrentWindow(windows[1])
    const win = await nvim.getCurrentWindow()
    expect(win).to.deep.equal(windows[1])
    const buf = await nvim.getCurrentBuffer()
    expect(buf).to.be.an.instanceof(nvim.Buffer)
    const lines = await buf.getLineSlice(0, -1, true, true)
    expect(lines).to.deep.equal([''])
    await buf.setLineSlice(0, -1, true, true, ['line1', 'line2'])
    const lines2 = await buf.getLineSlice(0, -1, true, true)
    expect(lines2).to.deep.equal(['line1', 'line2'])
  })

  it('emits "disconnect" after quit', function(done) {
    nvim.on('disconnect', done)
    nvim.quit()
  })

})
