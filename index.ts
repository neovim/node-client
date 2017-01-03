
import { EventEmitter } from "events"
import Session = require('msgpack5rpc')
import * as _ from "lodash"
import * as traverse from "traverse"

interface NvimType {
  _client: NvimClient
  equals(other: any): boolean
}

class NvimClient extends EventEmitter {

  _client = this
  _session: Session
  _types: { [name: string]: NvimType }
  _channel_id: number

  private static decode(obj) {
    //return traverse(obj).map(function(item) {
      //if (item instanceof Session) {
        //this.update(item, true)
      //} else if (Buffer.isBuffer(item)) {
        //try { this.update(item.toString('utf8')); } catch (e) { }
      //}
    //})
    return obj
  }

  private generateWrappers(functions) {

    for (const func of functions) {

      const className = _.capitalize(func.name.substring(0, func.name.indexOf('_')))
      const params = func.parameters.map(([type, name]) => ({ type, name }))
      const methodName = _.camelCase(func.name.substring(func.name.indexOf('_')))
      const isGlobal = ['Vim', 'Nvim', 'Ui'].indexOf(className) !== -1

      const method = function(...args) {
        if (!isGlobal)
          args.unshift(this)
        return this._client._session.request(func.name, args)
          .then(res => NvimClient.decode(res))
          .catch(([id,msg]) => {
            throw new Error(msg)
          })
      }

      const metadata = method['metadata'] = _.mapKeys(_.omit(func, 'name', 'parameters')
        , key => _.camelCase(key))
      metadata.parameters = params
      metadata.name = methodName
  
      const Class = isGlobal ? NvimClient : NvimClient.prototype[className]

      Class.prototype[metadata.name] = method

    }
  }

  attach(writer, reader) {

    const initSession = new Session()

    initSession.attach(writer, reader)

    return initSession.request('vim_get_api_info', [])

      .then(([channel_id, { functions, types }]) => {

        this._channel_id = channel_id
        this._types = types

        const sessionTypes = _.map(types, ({ version, id, prefix }, name) => {

          class NvimType implements NvimType {

            _data: Buffer
            _client: NvimClient

            constructor(client, data: Buffer) {
              this._client = client
              this._data = data
            }

            equals(other: any): boolean {
              try {
                return this._data.toString() === other._data.toString()
              } catch (e) {
                return false;
              }
            }

          }

          NvimClient.prototype[name] = NvimType
          
          return {
            constructor: NvimType
          , code: id
          , decode: (data) => new NvimType(this, data)
          , encode: (obj) => obj._data
          }

        })

        initSession.detach()

        this._session = new Session(sessionTypes)
        this._session.attach(writer, reader)
        
        this._session.on('request', (method, args, resp) => {
          this.emit('request', NvimClient.decode(method), NvimClient.decode(args), resp)
        })

        this._session.on('notification', (method, args) => {
          this.emit('notification', NvimClient.decode(method), NvimClient.decode(args))
        })

        this._session.on('detach', () => {
          this._session.removeAllListeners('request')
          this._session.removeAllListeners('notification')
          this.emit('disconnect')
        })
        
        this.generateWrappers(functions)
      })

  }

  // extra commands

  quit() {
    return this['command']('qa!')
  }

}

export = function attach(writer, reader) {
  const nvim = new NvimClient()
  return nvim.attach(writer, reader).then(() => nvim)
}

