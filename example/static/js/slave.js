window.onload = function() {
  let pairId = location.pathname.split('/')[2];
  const socket = io(location.origin);
  const statusDiv = document.querySelector('.status');
  const setStatus = (status) => {
    statusDiv.innerHTML = status;
  }
  
  let n = 0;
  const handleOrientation = (e) => {
    const {
      alpha, beta, gamma,
    } = e;

    n++;
    if (n === 3) {
      socket.emit('data', { data: { alpha, beta, gamma } });
      n = 0;
    }
  };

  window.addEventListener("deviceorientation", handleOrientation, true);

  setStatus('connecting...');
  socket.on('connect', () => {
    socket.emit('hi', {
      role: 'slave',
      id: pairId,
    });
  });
  socket.on('disconnect', () => {
    socket.open();
    setStatus('connecting...');
  });
  socket.on('start', function() {
    setStatus('connected: started');
  });
  socket.on('pause', function() {
    setStatus('connected: paused');
  });
  socket.on('bye', function({ error } = {}) {
    setStatus(`error: ${error}`);
  });
};