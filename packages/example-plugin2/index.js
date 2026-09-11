const required = require('./fixture');
const neovim = require('neovim');

let nvim;

function hostTest(args, range) {
  if (args[0] === 'canhazresponse?') {
    throw new Error('no >:(');
  }

  nvim.setLine('A line, for your troubles');

  return 'called hostTest';
}

function onBufEnter(filename) {
  return new Promise((resolve, reject) => {
    console.log('This is an annoying function ' + filename);
    resolve(filename);
  });
}

function main() {
  nvim = neovim.cli();
  // Now that we successfully started, we can remove the default listener.
  //nvim.removeAllListeners('request');
  nvim.setHandler('testMethod1', hostTest);
}

main();
