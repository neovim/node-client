export type Spec = {
  type: 'function' | 'autocmd' | 'command';
  name: string;
  sync: boolean;
  opts: {
    range?: string;
    nargs?: string;
    eval?: string;
    pattern?: string;
    complete?: string;
  };
};
