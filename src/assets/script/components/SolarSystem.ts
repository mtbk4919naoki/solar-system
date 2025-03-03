import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import PlanetaryObject from './modules/PlanetaryObject';
export default class SolarSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraMode: number;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  private indicator: HTMLElement;
  private helperIndicator: HTMLElement;
  private isHelperVisible: boolean;
  private speedIndicator: HTMLElement;
  private width: number;
  private height: number;
  private lights: {
    ambientLight: THREE.AmbientLight;
    pointLight: THREE.PointLight;
  };
  private helpers: {
    axisHelper: THREE.AxesHelper;
    pointLightHelper: THREE.PointLightHelper;
  };
  private orbitCurves: THREE.Line[];
  private planets: PlanetaryObject<THREE.SphereGeometry, THREE.MeshBasicMaterial|THREE.MeshPhongMaterial>[];
  private backgroundSphere: THREE.Mesh;
  private currentPlanet: PlanetaryObject<THREE.SphereGeometry, THREE.MeshBasicMaterial|THREE.MeshPhongMaterial> | null;
  private pause: boolean;
  private frameMultiplier: number;
  private frame: number;

  constructor(container: HTMLElement, indicator: HTMLElement, speedIndicator: HTMLElement, helperIndicator: HTMLElement) {
    this.container = container;
    this.indicator = indicator;
    this.speedIndicator = speedIndicator;
    this.helperIndicator = helperIndicator;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(new THREE.Color(0x000000));
    this.renderer.setSize(this.width, this.height);
    this.renderer.shadowMap.enabled = true;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    
    this.camera = this.addCamera();
    this.cameraMode = 0;
    this.controls = this.addControls();
    this.backgroundSphere = this.addBackgroundSphere();
    this.currentPlanet = null;
    this.pause = false;
    this.frameMultiplier = 1;
    this.planets = [];
    this.frame = 0;

    this.lights = this.addLight();

    this.helpers = this.addHelper()
    this.hideHelper();
    this.orbitCurves = [];

    this.addSun();
    this.addMercury();
    this.addVenus();
    this.addEarth();
    this.addMars();
    this.addJupiter();
    this.addSaturn();
    this.addUranus();
    this.addNeptune();
    
    this.addStars();
    this.addFog();

    this.setFrameMultiplier(1);

    this.render();

    // ウィンドウのリサイズ時の処理
    window.addEventListener('resize', () => {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    });

    // キーを押したときの処理
    window.addEventListener('keydown', (event) => {
      // スペースキーで一時停止
      if (event.key == ' ') {
        event.preventDefault();
        this.togglePause();
      }

      // Zキーを押したらヘルパーの表示を切り替え
      if (event.key === 'z') {
        event.preventDefault();
        this.toggleHelper();
      }

      // 左キーでカメラモードを切り替え
      if (event.key == 'ArrowLeft') {
        event.preventDefault();
        this.prevCameraMode();
      }

      // 右キーでカメラモードを切り替え
      if (event.key == 'ArrowRight') {
        event.preventDefault();
        this.nextCameraMode();
      }

      // 上キーで倍速
      if (event.key == 'ArrowUp') {
        event.preventDefault();
        this.fasterFrameMultiplier();
      }

      // 下キーで減速
      if (event.key == 'ArrowDown') {
        event.preventDefault();
        this.slowerFrameMultiplier();
      }
      
      // 数字キーでカメラモードを切り替え
      if ( /\d/.test(event.key) ) {
        event.preventDefault();
        this.switchCameraMode(parseInt(event.key));
      }
    });

    // // レイキャスターとマウスベクトルの初期化
    // const raycaster = new THREE.Raycaster();
    // const mouse = new THREE.Vector2();

    // window.addEventListener('click', (event) => {
    //   event.preventDefault();

    //   // マウス位置を取得
    //   mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    //   mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    //   // レイキャストを設定
    //   raycaster.setFromCamera(mouse, this.camera);

    //   // 惑星オブジェクトとの交差をチェック
    //   const planetMeshes = this.planets.map(planet => planet.mesh);

    //   // スケールを一時的に拡大
    //   planetMeshes.forEach(mesh => mesh.scale.multiplyScalar(3.5));

    //   const intersects = raycaster.intersectObjects(planetMeshes, true);

    //   // スケールを元に戻す
    //   planetMeshes.forEach(mesh => mesh.scale.multiplyScalar(1 / 3.5));

    //   if (intersects.length > 0) {
    //     // 惑星がタップされた場合、カメラモードを切り替える
    //     if (this.currentPlanet?.mesh == intersects[0].object) {
    //       this.switchCameraMode(0);
    //     } else {
    //       this.planets.forEach(planet => {
    //         if(intersects[0].object === planet.mesh) {
    //           this.switchCameraMode(this.planets.indexOf(planet) + 1);
    //         }
    //       });
    //     }
    //   }
    // });
  }

  /**
   * インジケーターを更新
   */
  updateIndicator(text: string) {
    this.indicator.textContent = text;
  }

  /**
   * スピードインジケーターを更新
   */
  updateSpeedIndicator(text: string) {
    this.speedIndicator.textContent = text;
  }

  /**
   * ライトを追加
   * @returns ライト
   */
  addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, this.filterRevolutionSize(36000), 0.10);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = true;

    this.scene.add(pointLight);

    return { ambientLight, pointLight };
  }

  /**
   * カメラを追加
   * @returns カメラ
   */
  addCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 10, this.filterRevolutionSize(36000));
    this.switchCameraMode(0);
    this.scene.add(this.camera);

    return this.camera;
  }

  /**
   * カメラのモードを切り替え
   */
  switchCameraMode(number: number) {
    this.cameraMode = number;
    
    if (this.cameraMode === 0) {
      this.currentPlanet = null;
      this.camera.position.set(-500, 250, 500);
      this.camera.lookAt(0, 0, 0);
      if(this.controls) {
        this.controls.target.set(0, 0, 0);
      }
      this.updateIndicator('太陽系（Solar System）');
    } else {
      this.currentPlanet = this.planets[number - 1];
      this.updateIndicator(`${this.currentPlanet?.name}`);
    }
  }

  /**
   * 次のカメラモードに切り替え
   */
  nextCameraMode() {
    this.switchCameraMode((this.cameraMode + 1) % 10);
  }

  /**
   * 前のカメラモードに切り替え
   */
  prevCameraMode() {
    this.switchCameraMode((this.cameraMode + 10 - 1) % 10);
  }

  /**
   * 倍速を設定
   */
  setFrameMultiplier(multiplier: number) {
    this.frameMultiplier = multiplier;
    if(this.frameMultiplier <= Math.pow(2, -5)) {
      this.frameMultiplier = Math.pow(2, -5);
    } else if(this.frameMultiplier >= Math.pow(2, 10)) {
      this.frameMultiplier = Math.pow(2, 10);
    } else {
      this.frameMultiplier = multiplier;
    }

    this.updateSpeedIndicator(`${this.frameMultiplier}x`);
  }

  /**
   * 加速
   */
  fasterFrameMultiplier() {
    this.setFrameMultiplier(this.frameMultiplier * 2);
  }

  /**
   * 減速
   */
  slowerFrameMultiplier() {
    this.setFrameMultiplier(this.frameMultiplier / 2);
  }

  /**
   * 一時停止
   */
  togglePause() {
    this.pause = !this.pause;
    const pastText = this.indicator.textContent;
  }

  /**
   * ヘルパーを切り替え
   */
  toggleHelper() {
    if(this.isHelperVisible) {
      this.hideHelper();
    } else {
      this.showHelper();
    }
  }

  showHelper() {
    this.isHelperVisible = true;
    this.helpers.axisHelper.visible = this.isHelperVisible;
    this.helpers.pointLightHelper.visible = this.isHelperVisible;
    if(this.orbitCurves && this.orbitCurves.length > 0) {
      this.orbitCurves.forEach(orbit => orbit.visible = this.isHelperVisible);
    }
    if(this.helperIndicator) {
      this.helperIndicator.textContent = 'Helper: On';
    }
  }

  hideHelper() {
    this.isHelperVisible = false;
    this.helpers.axisHelper.visible = this.isHelperVisible;
    this.helpers.pointLightHelper.visible = this.isHelperVisible;
    if(this.orbitCurves && this.orbitCurves.length > 0) {
      this.orbitCurves.forEach(orbit => orbit.visible = this.isHelperVisible);
    }
    if(this.helperIndicator) {
      this.helperIndicator.textContent = 'Helper: Off';
    }
  }
  
  

  /**
   * フォグを追加
   */
  addFog() {
    this.scene.fog = new THREE.Fog(0x000000, this.filterRevolutionSize(3600), this.filterRevolutionSize(36000));
  }

  /**
   * コントロールを追加
   * @returns コントロール
   */
  addControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    return this.controls;
  }

  /**
   * 惑星のサイズをフィルタリング
   * @param number 惑星のサイズ
   * @param mode フィルタリングモード
   * @returns フィルタリングされた惑星のサイズ
   */
  filterPlanetSize(number: number, mode?: string) {
    if(mode === 'sun') {
      return Math.pow(number, 0.55);
    }
    if(mode === 'moon') {
      return Math.pow(number, 0.35);
    }
    if(mode === 'ringSize') {
      return Math.pow(Math.pow(number, 1.6), 0.45);
    }
    if(mode === 'ringWidth') {
      return Math.pow(number, 0.45);
    }
    return Math.pow(number, 0.65);
  }

  /**
   * 惑星の軌道のサイズをフィルタリング
   * @param number 惑星の軌道のサイズ
   * @param mode フィルタリングモード
   * @returns フィルタリングされた惑星の軌道のサイズ
   */
  filterRevolutionSize(number: number, mode?: string) {
    if(mode === 'moon') {
      return Math.pow(number, 0.75);
    }
    return Math.pow(number, 0.90);
  }

  /**
   * 太陽を追加
   */
  addSun() {
    const sun = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(6960, 'sun')), new THREE.MeshBasicMaterial({ color: 0xffee00 }));
    sun.setRotation(0.00563, new THREE.Vector3(0, 1, 0));
    sun.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(7.25));
    sun.setTexture('textures/sun.jpg');
    sun.setName('太陽（Sun）');
    sun.mesh.castShadow = false;
    this.planets.push(sun);

    this.scene.add(sun.mesh);
  }

  /**
   * 水星を追加
   */
  addMercury() {
    const mercury = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(24.40)), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    mercury.setRotation(0.0192, new THREE.Vector3(0, 1, 0));
    mercury.setRevolution(0.019862, this.filterRevolutionSize(387.0));
    mercury.setTexture('textures/mercury.jpg');
    mercury.setName('水星（Mercury）');
    this.planets.push(mercury);
    this.scene.add(mercury.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(387.0));
  }

  /**
   * 金星を追加
   */
  addVenus() {
    const venus = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(60.52)), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    venus.setRotation(-0.00593, new THREE.Vector3(0, 1, 0));
    venus.setRevolution(0.00512, this.filterRevolutionSize(723.3));
    venus.setTexture('textures/venus.jpg');
    venus.setName('金星（Venus）');
    venus.setAxisTilt(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(177.36));
    this.planets.push(venus);
    this.scene.add(venus.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(723.3));
  }

  /**
   * 地球と月を追加
   */
  addEarth() {
    const earth = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(63.71)), new THREE.MeshPhongMaterial({ color: 0xcceeff }));
    earth.setRotation(0.152, new THREE.Vector3(0, 1, 0));
    earth.setRevolution(0.0032, this.filterRevolutionSize(1000), new THREE.Vector3(0, 1, 0));
    earth.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(23.5));
    earth.setTexture('textures/earth.jpg');
    earth.setName('地球（Earth）');

    const moon = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(17.38, 'moon')), new THREE.MeshPhongMaterial({ color: 0xffffcc }));
    moon.setRotation(0.1336, new THREE.Vector3(0, 1, 0));
    moon.setRevolution(0.152, this.filterRevolutionSize(this.filterPlanetSize(3838), 'moon'), new THREE.Vector3(0, 1, 0));
    moon.setTexture('textures/moon.jpg');
    earth.addSatellite(moon);

    this.planets.push(earth);
    this.scene.add(earth.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(1000));
  }

  /**
   * 火星を追加
   */
  addMars() {
    const mars = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(33.90)), new THREE.MeshPhongMaterial({ color: 0xff9933 }));
    mars.setRotation(0.152, new THREE.Vector3(0, 1, 0));
    mars.setRevolution(0.0017, this.filterRevolutionSize(1523.7));
    mars.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(25.19));
    mars.setTexture('textures/mars.jpg');
    mars.setName('火星（Mars）');
    this.planets.push(mars);
    this.scene.add(mars.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(1523.7));
  }

  /**
   * 木星を追加
   */
  addJupiter() {
    const jupiter = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(699.11)), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    jupiter.setRotation(0.3648, new THREE.Vector3(0, 1, 0));
    jupiter.setRevolution(0.00027, this.filterRevolutionSize(5203));
    jupiter.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(3.1));
    jupiter.setTexture('textures/jupiter.jpg');
    jupiter.setName('木星（Jupiter）');
    this.planets.push(jupiter);
    this.scene.add(jupiter.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(5203));
  }

  /**
   * 土星を追加
   */
  addSaturn() {
    const saturn = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(582.32)), new THREE.MeshPhongMaterial({ color: 0xffeedd }));
    saturn.setRotation(0.3648, new THREE.Vector3(0, 1, 0));
    saturn.setRevolution(0.0001086, this.filterRevolutionSize(9538.8));
    saturn.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(26.7));
    saturn.setTexture('textures/saturn.jpg');
    saturn.setName('土星（Saturn）');

    const ring = new PlanetaryObject(new THREE.TorusGeometry(this.filterPlanetSize(582.32, 'ringSize'), this.filterPlanetSize(583.32,'ringWidth')), new THREE.MeshPhongMaterial({ color: 0xcc9966, opacity: 0.7, transparent: true }));
    ring.mesh.scale.set(1,1,0.1);
    ring.setRotation(0.01, new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(5.0)), 0, Math.cos(THREE.MathUtils.degToRad(5.0))));
    ring.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(90));
    ring.setTexture('textures/saturn.jpg');

    saturn.addSatellite(ring);

    this.planets.push(saturn);
    this.scene.add(saturn.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(9538.8));
  }

  /**
   * 天王星を追加
   */
  addUranus() {
    const uranus = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(253.62)), new THREE.MeshPhongMaterial({ color: 0x88ddff }));
    uranus.setRotation(0.20267, new THREE.Vector3(0, 1, 0));
    uranus.setRevolution(0.00003808, this.filterRevolutionSize(19191.4));
    uranus.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(98));
    uranus.setTexture('textures/uranus.jpg');
    uranus.setName('天王星（Uranus）');

    const ring = new PlanetaryObject(new THREE.TorusGeometry(this.filterPlanetSize(253.62, 'ringSize'), this.filterPlanetSize(253.62,'ringWidth')), new THREE.MeshPhongMaterial({ color: 0xeeddee, opacity: 0.7, transparent: true }));
    ring.mesh.scale.set(1,1,0.1);
    ring.setRotation(0.01, new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(-5.0)), 0, Math.cos(THREE.MathUtils.degToRad(-5.0))));
    ring.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(0));
    ring.setTexture('textures/uranus.jpg');

    uranus.addSatellite(ring);

    this.planets.push(uranus);
    this.scene.add(uranus.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(19191.4));
  }

  /** 
   * 海王星を追加
   */
  addNeptune() {
    const neptune = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(246.22)), new THREE.MeshPhongMaterial({ color: 0x0000ff }));
    neptune.setRotation(0.228, new THREE.Vector3(0, 1, 0));
    neptune.setRevolution(0.0000194, this.filterRevolutionSize(30061.1));
    neptune.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(28.3));
    neptune.setTexture('textures/neptune.jpg');
    neptune.setName('海王星（Neptune）');
    this.planets.push(neptune);
    this.scene.add(neptune.group);

    // 軌道を追加
    this.addOrbit(this.filterRevolutionSize(30061.1));
  }

  /**
   * 星を追加
   */
  addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 3 });
    
    const starVertices = [];
    for (let i = this.filterRevolutionSize(8000); i > 0; i--) {
      const x = THREE.MathUtils.randFloatSpread(this.filterRevolutionSize(36000));
      const y = THREE.MathUtils.randFloatSpread(this.filterRevolutionSize(36000));
      const z = THREE.MathUtils.randFloatSpread(this.filterRevolutionSize(36000));
      starVertices.push(x, y, z);
    }

    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));

    const stars = new THREE.Points(starsGeometry, starsMaterial);

    this.scene.add(stars);
  }

  /**
   * 背景球体を追加
   * @returns 背景球体
   */
  addBackgroundSphere() {
    const backgroundSphereGeometry = new THREE.SphereGeometry(this.filterRevolutionSize(36000));
    // // ShaderMaterialを使用しない場合
    // const backgroundSphereMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x444444,
    //   opacity: 0.8,
    //   transparent: true,
    //   side: THREE.BackSide
    // });
    // backgroundSphereMaterial.map = new THREE.TextureLoader().load('textures/space.jpg');

    // ShaderMaterialを使用する場合
    const backgroundSphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: new THREE.TextureLoader().load('textures/space.jpg') },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        varying vec2 vUv;

        void main() {
          gl_FragColor = texture2D(uTexture, vUv);
          gl_FragColor.a = 0.2;
        }
      `,
      side: THREE.BackSide,
      transparent: true,

    });
    const backgroundSphere = new THREE.Mesh(backgroundSphereGeometry, backgroundSphereMaterial);

    this.scene.add(backgroundSphere);
    return backgroundSphere;
  }

  /**
   * ヘルパーを追加
   * @returns ヘルパー
   */
  addHelper() {
    const axisHelper = new THREE.AxesHelper(this.filterRevolutionSize(36000));
    const pointLightHelper = new THREE.PointLightHelper(this.lights.pointLight, this.filterPlanetSize(6960, 'sun'));

    axisHelper.visible = false;
    pointLightHelper.visible = false;

    this.scene.add(axisHelper);
    this.scene.add(pointLightHelper);

    return { axisHelper, pointLightHelper };
  }

  /**
   * 軌道を追加
   * @param radius 軌道の半径
   * @returns 軌道の線
   */
  addOrbit(radius: number) {
    const curve = new THREE.EllipseCurve(
      0, 0,            // ax, aY
      radius, radius,  // xRadius, yRadius
      0, 2 * Math.PI,  // aStartAngle, aEndAngle
      false,           // aClockwise
      0                // aRotation
    );

    const points = curve.getPoints(100);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const orbit = new THREE.Line(geometry, material);

    orbit.rotation.x = Math.PI / 2; // 軌道を水平にする
    orbit.visible = false;

    this.scene.add(orbit);

    this.orbitCurves.push(orbit);

    return orbit;
  }

  /**
   * レンダリング
   */
  render() {
    requestAnimationFrame(() => this.render());

    if(!this.pause){
      this.frame += this.frameMultiplier;
  
      // 惑星（衛星）の更新
      this.planets.forEach(planet => {
        planet.update(this.frame, this.frameMultiplier);
      });
    }

    this.backgroundSphere.position.copy(this.camera.position);

    // カメラモードによる切り替え
    if(this.cameraMode === 0) {
      this.controls.enabled = true;

      // カメラのパンを制限
      const maxDistance = 36000;
      const distanceFromOrigin = this.camera.position.length();

      if(distanceFromOrigin > maxDistance) {
        this.camera.position.setLength(maxDistance);
      }
      this.controls.update();
    } else {
      this.controls.enabled = false;

      // カメラの位置を計算 
      const targetPlanet = this.planets[this.cameraMode - 1];
      const targetPosition = targetPlanet.group.position;
      const cameraPosition = targetPosition.clone();
      const targetSize = targetPlanet.mesh.geometry.parameters.radius;
      
      // // カメラの位置と向きを線形補完で更新
      cameraPosition.x += targetSize * 4.5 + 10;  
      cameraPosition.y += targetSize * 4.5 + 10;  
      cameraPosition.z += targetSize * 4.5 + 10;

      // 水星は早いので補完を早くする
      let lerp = 0.15;
      if(this.cameraMode <= 2) {
        lerp = 0.30;
      }
      
      const currentLookAt = new THREE.Vector3();
      this.camera.getWorldDirection(currentLookAt);

      const targetLookAt = targetPosition.clone().sub(this.camera.position).normalize();

      if(this.keyDownX || this.keyDownC || this.keyDownV) {
        this.camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
        this.camera.lookAt(targetPosition);
      } else {
        this.camera.position.lerp(cameraPosition, lerp);
        this.camera.lookAt(this.camera.position.clone().add(currentLookAt.lerp(targetLookAt, lerp)));
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
