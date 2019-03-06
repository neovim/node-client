export interface Spec {
  type: 'function' | 'autocmd' | 'command';
  name: string;
  sync: boolean;
  opts: {
    range?: string;
    nargs?: string;
    // eslint-disable-next-line no-eval
    eval?: string;
    pattern?: string;
    complete?: string;
  };
}
