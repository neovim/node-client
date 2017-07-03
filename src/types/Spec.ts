export type Spec = {
  type: 'function' | 'autocmd' | 'command';
  name: string;
  sync: boolean;
  opts: {
    range?: string;
    eval?: string;
    pattern?: string;
  };
};
