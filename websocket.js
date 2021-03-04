const { Duplex } = require('streamx')
const bint = require('bint8array')

module.exports = class WebSocketStream extends Duplex {
  constructor (socket, opts = {}) {
    super()

    this.socket = socket
    this.onconnect = opts.onconnect || noop

    if (this.socket.on) {
      this.socket.on('message', (data) => this._pushBuffer(data))
      this.socket.on('error', (err) => this.destroy(err))
    } else {
      this.socket.binaryType = 'arraybuffer'
      this.socket.onmessage = (e) => this.push(new Uint8Array(e.data))
      this.socket.onerror = (err) => this.destroy(err)
    }

    this._readableState.updateNextTick() // trigger open straight way
  }

  _pushBuffer (data) {
    if (typeof data === 'string') data = bint.fromString(data)
    if (!(data instanceof Uint8Array)) return
    this.push(data)
  }

  _open (cb) {
    if (this.socket.readyState === 1) return cb(null)
    if (this.socket.readyState !== 0) return cb(new Error('Closed'))

    const self = this
    const onopen = () => done(null)
    const onclose = () => done(new Error('Closed'))

    if (this.socket.on) {
      this.socket.on('open', onopen)
      this.socket.on('close', onclose)
    } else {
      this.socket.onopen = onopen
      this.socket.onclose = onclose
    }

    function done (err) {
      if (self.socket.on) {
        self.socket.removeListener('open', onopen)
        self.socket.removeListener('close', onclose)
      } else {
        self.socket.onopen = null
        self.socket.onclose = null
      }

      if (!err) {
        self.emit('connect')
        self.onconnect()
      }
      cb(err)
    }
  }

  _predestroy () {
    this.socket.close()
  }

  _destroy (cb) {
    this.socket.close()
    cb()
  }

  _write (data, cb) {
    this.socket.send(data)
    cb(null)
  }
}

function noop () {}
