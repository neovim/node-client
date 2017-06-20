/* eslint global-require:0 */
import { plugin } from './plugin';
import { nvimFunction } from './function';
import { autocmd } from './autocmd';
import { command } from './command';

export { plugin as Plugin } from './plugin';
export { nvimFunction as Function } from './function';
export { autocmd as Autocmd } from './autocmd';
export { command as Command } from './command';
