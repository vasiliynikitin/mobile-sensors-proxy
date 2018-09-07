const crypto = require('crypto');
const SocketIO = require('socket.io');

const ID_LENGTH = 3;
const CONNECTION_TM = 5 * 1000;
const roles = {
  HOST: 'host',
  SLAVE: 'slave',
};

function generateId() {
  return crypto.randomBytes(ID_LENGTH).toString('base64');
};

class Pairs {
  constructor() {
    this.pairs = {};
  }

  get(id) {
    return this.pairs[id];
  }

  set(id, pair) {
    if (id === null) {
      id = generateId();
    }
    if (this.get(id)) {
      return null;
    }
    this.pairs[id] = pair;
    return id;
  }

  add(pair) {
    let id = null;
    while ((id = this.set(id, pair))  === null);
    pair.onDestroy = () => this.remove(id);
    return id;
  }

  remove(id) {
    const pair = this.get(id);
    if (pair) {
      delete pair.onDestroy;
      pair.destroy();
      delete this.pairs[id];
    }
  }
}

class Pair {
  proxyData({ data } = {}) {
    if (this.hostSocket) {
      if (this.hostSocket.disconnected) {
        this.hostLost();
      } else {
        this.hostSocket.emit('data', { data });
      }
    }
  }

  hostLost() {
    delete this.hostSocket;
    if (this.slaveSocket) {
      this.slaveSocket.emit('pause');
    }
    this.hostReconnectTm = setTimeout(this.destroy.bind(this), CONNECTION_TM);
  }

  addHost({ socket, id }) {
    if (this.slaveSocket) {
      throw new Error('Host already set');
    }
    this.hostSocket = socket;
    socket.emit('hi', { id });
    socket.on('disconnect', this.hostLost.bind(this));
    if (this.hostReconnectTm) {
      clearTimeout(this.hostReconnectTm);
      delete this.hostReconnectTm;
    }
    if (this.slaveSocket) {
      this.slaveSocket.emit('start');
    }
  }
  
  addSlave({ socket }) {
    if (this.slaveSocket) {
      throw new Error('Already paired');
    }
    this.slaveSocket = socket;
    socket.on('data', this.proxyData.bind(this));
    socket.on('disconnect', () => {
      delete this.slaveSocket;
    });
    if (this.hostSocket) {
      this.hostSocket.emit('paired', {});
      this.slaveSocket.emit('start');
    } else {
      this.hostLost();
    }
  }

  destroy() {
    if (this.slaveSocket) {
      this.slaveSocket.emit('bye', {});
      this.slaveSocket.disconnect();
    }
    if (this.hostSocket) {
      this.hostSocket.emit('bye', {});
      this.hostSocket.disconnect();
    }
    if (this.onDestroy) {
      this.onDestroy();
    }
  }
}

function proxy(...args) {
  const pairs = new Pairs();
  const io = new SocketIO(...args);
  io.on("connection", function (socket) {
    socket.on('hi', (data = {}) => {
      const { role, id = null } = data;
      if (role === roles.HOST) {
        let pairId = id;
        let pair = pairs.get(id);
        if (!pair) {
          pair = new Pair();
          pairId = pairs.add(pair);
        }
        pair.addHost({
          socket,
          id: pairId,
        });
      } else if (role === roles.SLAVE) {
        try {
          if (!id) {
            throw new Error('No ID specified');
          }
          const pair = pairs.get(id);
          if (!pair) {
            throw new Error(`No host found for ID ${id}`);
          }
          pair.addSlave({
            socket,
          });
        } catch(error) {
          socket.emit('bye', { error: error.message });
        }
      }
    });

  });
}

module.exports = proxy;