export interface FunctionOptions {
  sync?: boolean;
  range?: string;
  eval?: string;
}

export interface AutocmdOptions {
  pattern: string;
  eval?: string;
  sync?: boolean;
}

export interface CommandOptions {
  sync?: boolean;
  range?: string;
  nargs?: string;
  complete?: string;
}

export interface PluginOptions {
  dev?: boolean;
}
