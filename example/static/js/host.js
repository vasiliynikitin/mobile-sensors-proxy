(function() {
  let setRotation = () => {};

  function init3d() {
    let loading = true;
    const progress = document.querySelector('.progress');
    const tick = document.querySelector('.bar__tick');
    let rotation;

    const canvas = document.querySelector('canvas');
    const beforeDraw = () => {
      return !loading;
    };
    d3.init({ canvas, beforeDraw });
    d3.getCamera().position.set(0, 100, 200);
    
    d3.loadAll({
      man: {
        path: '/models/man/',
        mtl: 'male02_dds.mtl',
        obj: 'male02.obj',
      },
    }, {
      onProgress: (totalPercent, percentItem, n, l) => {
        tick.style.width = `${totalPercent * 100}%`;
        console.log(`TOTAL: ${parseInt(totalPercent * 100)}% | ${parseInt(percentItem * 100)}% (${n} / ${l})`);
      }
    }).then((objects) => {
      const mesh = objects.man.object;
      progress.remove();

      d3.getScene().onBeforeRender = () => {
        if (rotation) {
          mesh.rotation.x = rotation.beta / 180 * Math.PI;
          mesh.rotation.y = (rotation.alpha - 90) / 180 * Math.PI;
          mesh.rotation.z = -rotation.gamma / 180 * Math.PI;
          rotation = null;
        }
      };
      d3.sceneAdd(mesh);
      d3.start();
      
      setRotation = (data) => {
        rotation = data;
        console.log(data);
      };
    });
  }

  function initSocket() {
    let pairId;
    const socket = io(location.origin);
    const statusDiv = document.querySelector('.status');
    const msgsDiv = document.querySelector('.messages');
    const setStatus = (status) => {
      statusDiv.innerHTML = status;
    }
    setStatus('connecting...');
    socket.on('connect', () => {
      const obj = { role: 'host'};
      if (pairId) {
        obj.id = pairId;
      }
      socket.emit('hi', obj);
    });
    socket.on('hi', function(data = {}) {
      const { id } = data;
      if (!id) {
        setStatus('ERROR: wrong "hi" response');
      }
      setStatus(`open <code>${location.origin}/slave/${id}</code> on mobile device`);
    });
    socket.on('data', function({ data } = {}) {
      // addMsg(JSON.stringify(data) || 'empty message');
      setRotation(data);
    });
    socket.on('disconnect', function() {
      setStatus('disconnected. reload page for new connection');
    });
  };

  window.onload = function() {
    initSocket();
    init3d();
  };
})();
