var cp = require('child_process');

var attach = require('./index');
var promiseApi = process.argv.indexOf('--promise') !== -1;

var proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
  cwd: __dirname
});

var typeMap = {
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
    var t = convertType(genericMatch[1]);
    if (/^Array/.test(type))
      return 'Array<' + t + '>';
    else
      return '{ [key: string]: ' + t + '; }';
  }
  return type;
}

function metadataToSignature(method, returnPromise) {
  var params = [];
  for (var i = 0; i < method.parameters.length - 1; i++) {
    var type;
    if (method.parameterTypes.length <= i) {
      type = 'any';
    } else {
      type = convertType(method.parameterTypes[i]);
    }
    params.push(method.parameters[i] + ': ' + type);
  }
  var rtype = convertType(method.returnType);
  if (returnPromise) {
    return '  ' + method.name + '(' + params.join(', ') + '): Promise<'+ rtype +'>;\n';
  }
  var type = '(err: Error';
  if (rtype === 'void') {
    type += ') => void';
  } else {
    type += ', res: ' + rtype + ') => void';
  }
  // Last parameter is callback
  params.push(method.parameters[method.parameters.length - 1] + ': ' + type);
  return '  ' + method.name + '(' + params.join(', ') + '): void;\n';
}

attach(proc.stdin, proc.stdout, function(err, nvim) {
  var interfaces = {
    Nvim: nvim.constructor,
    Buffer: nvim.Buffer,
    Window: nvim.Window,
    Tabpage: nvim.Tabpage,
  };

  // use a similar reference path to other definitely typed declarations
  process.stdout.write('export default function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, cb: (err: Error, nvim: Nvim) => void): void;\n\n');

  Object.keys(interfaces).forEach(function(key) {
    var name = key;
    if (key === 'Nvim') {
      name += ' extends NodeJS.EventEmitter';
    }
    process.stdout.write('export interface ' + name + ' {\n');
    if (key === 'Nvim') {
      process.stdout.write('  quit(): void;\n');
    }
    Object.keys(interfaces[key].prototype).forEach(function(method) {
      method = interfaces[key].prototype[method];
      if (method.metadata) {
        process.stdout.write(metadataToSignature(method.metadata, promiseApi));
      }
    })
    process.stdout.write('  equals(rhs: ' + key + '): boolean;\n');
    process.stdout.write('}\n');
  });

  proc.stdin.end();
});
