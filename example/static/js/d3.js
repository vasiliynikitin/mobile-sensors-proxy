let d3;

(function() {
  let camera;
  let renderer;
  let scene;
  let started;
  
  function draw() {
    renderer.render(scene, camera);
    if (started) {
      requestAnimationFrame(draw);
    }
  }

  d3 = {
    init: function({ canvas, beforeDraw }) {
      const { width, height } = canvas;
      camera = new THREE.PerspectiveCamera(70, width / height, 1, 1000);
      scene = new THREE.Scene();
      renderer = new THREE.WebGLRenderer({
        // antialias: true,
        canvas,
      });

      const ambientLight = new THREE.AmbientLight(0xcccccc, 0.3);
      scene.add(ambientLight);

      var pointLight = new THREE.PointLight(0xffffff, 0.6);
      camera.add(pointLight);
      scene.add(camera);
      
      
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);

      beforeDrawCallback = beforeDraw;
    },
    start: function() {
      if (!started) {
        started = true;
        requestAnimationFrame(draw);
      }
    },
    stop: function() {
      started = false;
    },
    getCamera: function() {
      return camera;
    },
    getScene: function() {
      return scene;
    },
    loadAll: function (items, { onProgress: progress } = {}) {
      THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
      const objects = {};
      let l = 0;
      let n = 0;
      const onProgress = (progressEvent) => {
        let percent = n - 1;
        let percentItem = 0;
        if (progressEvent.lengthComputable) {
          percentItem = progressEvent.loaded / progressEvent.total;
          percent += percentItem;
        }
        percent = percent / l;
        if (progress) {
          progress(percent, percentItem, n, l);
        }
      };
      let promise = Promise.resolve();

      Object.keys(items).forEach((key) => {
        const item = items[key];
        l += (item.obj ? 1 : 0) + (item.mtl ? 1 : 0);
        promise = promise.then(() => {
          return Promise.resolve()
            .then(() => {
              const { mtl, path } = item;
              if (mtl) {
                n++;
                return this.loadMtl({ file: mtl, path, onProgress });
              }
            })
            .then((materials) => {
              const { obj, path } = item;
              return Promise.resolve()
                .then(() => {
                  if (obj) {
                    n++;
                    return this.loadObj({ file: obj, path, materials, onProgress });
                  }
                })
                .then(object => ({ object, materials, loaded: true }));
            })
            .catch((error => ({ error, loaded: false })))
            .then((obj) => {
              objects[key] = obj;
            });
        });
      });
      return promise.then(() => objects);
    },

    loadMtl: function({ file, path, onProgress }) {
      return new Promise((resolve, reject) => {
        new THREE.MTLLoader()
          .setPath(path)
          .load(file, resolve, onProgress, reject);
        })
          .then(( materials ) => {
            materials.preload();
            return materials;
          });
    },
    loadObj: function({ file, path, materials, onProgress}) {
      return new Promise((resolve, reject) => {
        let loader = new THREE.OBJLoader();
        if (materials) {
          loader = loader.setMaterials(materials)
        }
        loader
          .setPath(path)
          .load(file, resolve, onProgress, reject)
      });
    },
    sceneAdd: function(...args) {
      scene.add(...args);
    }
  };
})();