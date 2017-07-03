type Type = {
  code: string;
  constructor: Function;
  encode: (obj: { _data: Buffer }) => Buffer;
  decode: (data: string) => any;
};

declare module 'msgpack5rpc' {
  class Session extends NodeJS.EventEmitter {
    constructor(types: Type[]);
    addTypes(types: Type[]): void;
    attach(writer: NodeJS.WritableStream, reader: NodeJS.ReadableStream): void;
    detach(): void;
    request(method: string, args: any[], cb: Function): void;
    notify(method: string, args: any[]): void;
    _parse_message(msg: any[]): void;
  }

  export = Session;
}
