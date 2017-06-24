/* eslint global-require:0 */

export {
  plugin as Plugin,
  PluginWrapperInterface,
  PluginWrapperConstructor,
} from './plugin';
export { nvimFunction as Function, NvimFunctionOptions } from './function';
export { autocmd as Autocmd, AutocmdOptions } from './autocmd';
export { command as Command, CommandOptions } from './command';
