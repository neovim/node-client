/* eslint no-console:0  global-require:0 */
const { Metadata } = require('../lib/api/types');
const { Neovim } = require('../lib/api/Neovim');

const search = process.argv[2] || '';

const findConstructor = name => Metadata.find(obj => name.includes(obj.prefix));

const hasApiMethod = name => {
  // these are ignored because they are implemented, but has a non-normalized name/case
  if (
    [
      'nvim_feedkeys',
      'nvim_strwidth',
      'nvim_err_writeln',
      'nvim_buf_line_count',
      'nvim_buf_attach',
      'nvim_buf_detach',
      'nvim_get_hl_by_name',
      'nvim_get_hl_by_id',
      'nvim_execute_lua',
      'nvim_open_win',
    ].includes(name)
  ) {
    return true;
  }

  let methodName = name;
  const isSetter = name.includes('_set_');
  const isGetter =
    name.includes('_get_') ||
    name.includes('_is_') ||
    name.includes('_list_') ||
    name.includes('_current_');
  const isDelete = name.includes('_del_');

  // Strip prefix
  const mappedConstructor = findConstructor(name);
  if (mappedConstructor) {
    methodName = name.replace(mappedConstructor.prefix, '');
  }
  methodName = methodName
    .replace(/^nvim_/, '')
    .replace(/^(set|get|is|list|del)_/, '')
    .replace(/^current_/, '')
    .replace(/^hl_/, 'highlight_')
    .replace(/_buf(s|)/g, '_buffer$1')
    .replace(/_win(s|)/g, '_window$1')
    .replace(/_([a-z])/g, g => g[1].toUpperCase())
    .replace(/buf/g, 'buffer')
    .replace(/win/g, 'window');
  const titleMethodName = `${methodName[0].toUpperCase()}${methodName.slice(1)}`;

  const Constructor = (mappedConstructor && mappedConstructor.constructor) || Neovim;

  const descriptor = Object.getOwnPropertyDescriptor(Constructor.prototype, methodName);

  // check property descriptors
  if (descriptor && ((isSetter && descriptor.set) || (isGetter && descriptor.get))) {
    return true;
  }

  // check methods
  if (
    [
      methodName,
      isGetter && `get${titleMethodName}`,
      isSetter && `set${titleMethodName}`,
      isDelete && `delete${titleMethodName}`,
    ]
      .filter(v => !!v)
      .find(
        variation =>
          variation in Constructor.prototype || Constructor.prototype.hasOwnProperty(variation)
      )
  ) {
    return true;
  }

  return false;
};

async function main() {
  const nvim = await require('./nvim');
  const results = await nvim.requestApi();
  const { functions } = results[1];
  const lines = functions.filter(({ name }) => name.includes(search));
  const missing = lines
    .filter(metadata => typeof metadata.deprecated_since === 'undefined')
    .filter(metadata => !hasApiMethod(metadata.name));

  missing.forEach(metadata => {
    const params = metadata.parameters.map(p => p[1]);
    const paramTypes = metadata.parameters.map(p => p[0]);
    console.log(
      `${metadata.name}(${params
        .map((p, i) => `${p}: ${paramTypes[i]}`)
        .join(', ')}): ${metadata.return_type}`
    );
    console.log(`    method: ${metadata.method}`);
    console.log(`    since: ${metadata.since}`);
    console.log('');
  });
  process.exit(missing.length);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exit(1);
}
