export enum ExtType {
  Buffer,
  Window,
  Tabpage,
}
export interface ExtTypeConstructor<T> {
  new (...args: any[]): T;
}

export interface MetadataType {
  name: string;
  prefix: string;
}

export const Metadata: MetadataType[] = [
  {
    name: 'Buffer',
    prefix: 'nvim_buf_',
  },
  {
    name: 'Window',
    prefix: 'nvim_win_',
  },
  {
    name: 'Tabpage',
    prefix: 'nvim_tabpage_',
  },
];

export type Promisify<T> = {
  [K in keyof T]: Promise<T[K]>;
};
