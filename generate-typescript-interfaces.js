'use strict';

const cp = require('child_process')
    ,  _ = require('lodash')
    , attach = require('./index')

const proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
  cwd: __dirname
});

const typeMap = {
  'String': 'string',
  'Integer': 'number',
  'Boolean': 'boolean',
  'Array': 'Array<any>',
  'Dictionary': '{}',
};

function convertType(type) {
  if (typeMap[type]) return typeMap[type];
  var genericMatch = /Of\((\w+)[^)]*\)/.exec(type);
  if (genericMatch) {
    var t = `Nvim${convertType(genericMatch[1])}`
    if (/^Array/.test(type))
      return 'Array<' + t + '>';
    else
      return '{ [key: string]: ' + t + '; }';
  }
  return type;
}

function metadataToSignature(methodName, metadata, isGlobal) {
  const params = metadata.parameters.map(({ name, type }) => `${name}: ${convertType(type)}`)
  const returnType = convertType(metadata.returnType)
  return `${methodName}(${params.join(', ')}): Promise<${returnType}>\n`
}

attach(proc.stdin, proc.stdout).then(nvim => {

  function generate(name, Class, props) {
    process.stdout.write(`export interface Nvim${name} {\n`)
    _.forEach(Class.prototype, (method, name) => {
      if (method.metadata !== undefined)
        process.stdout.write(`  ${metadataToSignature(name, method.metadata)}`)
    })
    process.stdout.write(`  equals(other: any): boolean`)
    process.stdout.write(`\n}\n`)
  }

  //process.stdout.write(`declare namespace Nvim {\n`)
  _.forEach(nvim._types, (props, name) => { generate(name, nvim[name]) })
  generate('Client', nvim, { extends: 'EventEmitter' })
  process.stdout.write(`
export = function(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream): Promise<Nvim.Client>
`)

  proc.kill()

}).catch(e => console.log(e.stack))
