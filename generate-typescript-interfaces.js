const cp = require('child_process');
const attach = require('./index');

const proc = cp.spawn('nvim', ['-u', 'NONE', '-N', '--embed'], {
  cwd: __dirname,
});

const typeMap = {
  String: 'string',
  Integer: 'number',
  Boolean: 'boolean',
  Array: 'Array<any>',
  Dictionary: '{}',
};

function convertType(type) {
  if (typeMap[type]) return typeMap[type];
  const genericMatch = /Of\((\w+)[^)]*\)/.exec(type);
  if (genericMatch) {
    const t = convertType(genericMatch[1]);
    if (/^Array/.test(type)) return `Array<${t}>`;
    return `{ [key: string]: ${t}; }`;
  }
  return type;
}

function metadataToSignature(method) {
  const params = [];
  method.parameters.forEach((param, i) => {
    let type;
    if (i < method.parameterTypes.length) {
      type = convertType(method.parameterTypes[i]);
    }
    params.push(`${method.parameters[i]}: ${type}`);
  });
  const rtype = convertType(method.returnType);
  // eslint-disable-next-line
  const returnTypeString = rtype === 'void' ? rtype : `Promise<${rtype}>`;
  return `  ${method.name}(${params.join(', ')}): ${returnTypeString};\n`;
}

attach(proc.stdin, proc.stdout, (err, nvim) => {
  const interfaces = {
    Nvim: nvim.constructor,
    Buffer: nvim.Buffer,
    Window: nvim.Window,
    Tabpage: nvim.Tabpage,
  };

  // use a similar reference path to other definitely typed declarations
  process.stdout.write(
    'export default function attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream, cb: (err: Error, nvim: Nvim) => void): void;\n\n'
  );

  Object.keys(interfaces).forEach((key) => {
    let name = key;
    if (key === 'Nvim') {
      name += ' extends NodeJS.EventEmitter';
    }
    process.stdout.write(`export interface ${name} {\n`);
    if (key === 'Nvim') {
      process.stdout.write('  quit(): void;\n');
    }
    Object.keys(interfaces[key].prototype).forEach((method) => {
      // eslint-disable-next-line no-param-reassign
      method = interfaces[key].prototype[method];
      if (method.metadata) {
        process.stdout.write(metadataToSignature(method.metadata));
      }
    });
    process.stdout.write(`  equals(rhs: ${key}): boolean;\n`);
    process.stdout.write('}\n');
  });

  proc.stdin.end();
});
