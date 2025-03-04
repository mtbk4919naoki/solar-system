import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import PlanetaryObject from './modules/PlanetaryObject';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export default class SolarSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraMode: number;
  private isCameraTransitioning: boolean;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
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
  private reverse: boolean;
  private frameMultiplier: number;
  private frame: number;
  private alpha: number;

  constructor(container: HTMLElement, indicator: HTMLElement, speedIndicator: HTMLElement, helperIndicator: HTMLElement) {
    this.container = container;
    this.indicator = indicator;
    this.speedIndicator = speedIndicator;
    this.helperIndicator = helperIndicator;
    this.isHelperVisible = false;
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
    this.isCameraTransitioning = true;
    this.alpha = 0.5;
    this.controls = this.addControls();
    this.backgroundSphere = this.addBackgroundSphere();
    this.currentPlanet = null;
    this.pause = false;
    this.reverse = false;
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

    this.composer = this.setComposer();
    this.render();
    // renderの後にやらないとうまくいかない
    this.switchCameraMode(0);

    // ウィンドウのリサイズ時の処理
    window.addEventListener('resize', () => {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.composer.setSize(this.width, this.height);
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

      // Xキーを押している間は逆再生
      if (event.key === 'x') {
        event.preventDefault();
        this.reverse = true;
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

    // キーを離したときの処理
    window.addEventListener('keyup', (event) => {
      if (event.key === 'x') {
        event.preventDefault();
        this.reverse = false;
      }
    });
  }

  /**
   * レンダリング
   */
  render() {
    requestAnimationFrame(() => this.render());
    
    if(!this.pause){
      this.frame += this.frameMultiplier * (this.reverse ? -1 : 1);
      
      // 惑星（衛星）の更新
      this.planets.forEach(planet => {
        planet.update(this.frame, this.frameMultiplier);
      });
    }
    
    this.backgroundSphere.position.copy(this.camera.position);
    
    // カメラ制御
    if(this.isCameraTransitioning) {
      // カメラ移動中
      this.smoothCameraTransition();
    } else if(!this.currentPlanet || this.pause) {
      // 俯瞰モードか一時停止中
    } else {
      // 惑星追従中
      this.relativeCameraTransition();
    }

    this.composer.render();
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
   * コンポーザーを設定
   */
  setComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom effect
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(this.width / 2, this.height / 2), 1.0, 1.0, 0.5));

    return this.composer;
  }

  /**
   * ライトを追加
   * @returns ライト
   */
  addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 7, this.filterRevolutionSize(36000), 0.10);
    pointLight.position.set(0, 0, 0);
    pointLight.shadow.mapSize.set(2048, 2048);
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
    this.scene.add(this.camera);

    return this.camera;
  }

  /**
   * カメラのモードを切り替え
   */
  switchCameraMode(number: number) {
    this.cameraMode = number;
    this.isCameraTransitioning = true;
    this.alpha = 0.5;
    const duration = 200;
    let progress = 0;
    
    if (this.cameraMode === 0) {
      this.currentPlanet = null;
      this.updateIndicator('太陽系（Solar System）');
    } else {
      this.currentPlanet = this.planets[number - 1];
      this.updateIndicator(`${this.currentPlanet?.name}`);
    }

    /**
     * alphaを更新する
     */
    const moving = () => {
      progress += 1;
      this.alpha = progress / duration;
      if (progress < duration || !this.isCameraTransitioning) {
        requestAnimationFrame(moving);
      }
    }
    moving();
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
   * カメラの移動をスムーズにする
   * @returns 
   */
  smoothCameraTransition() {
    const { startPosition, startLookAt, endPosition, endLookAt, startDirection, endDirection } = this.calcCameraTransitionData();

    const position = new THREE.Vector3().lerpVectors(startPosition, endPosition, this.alpha);

    // @DEBIG
    // const distance = position.distanceTo(endPosition);
    // const difference = endDirection.clone().sub(startDirection);
    // this.updateIndicator(`${distance} / ${difference.length()}`)

    if (position.distanceTo(endPosition) < 1) {
      this.isCameraTransitioning = false;
    }

    // 近づいた時に物体に追いつけないことがあるので、物体の位置に向けてカメラを移動させる
    const offset = endPosition.clone().sub(startPosition).normalize();
    position.add(offset);

    const lookAt = new THREE.Vector3().lerpVectors(startLookAt, endLookAt, this.alpha);

    this.camera.position.copy(position);
    this.controls.target.copy(lookAt);
    this.camera.lookAt(lookAt);
  }

  /**
   * カメラをターゲットからの相対座標に固定する
   */
  relativeCameraTransition() {
    const { endPosition, endLookAt } = this.calcCameraTransitionData();
    this.camera.position.copy(endPosition);
    this.controls.target.copy(endLookAt);
    this.camera.lookAt(endLookAt);
  }

  /**
   * カメラの移動データを計算
   */
  calcCameraTransitionData() {
    const startPosition = this.camera.position.clone();
    const startLookAt = this.controls.target.clone();
    const startDirection = new THREE.Vector3(0, 0, 0);
    this.camera.getWorldDirection(startDirection).normalize();
    const endPosition = this.currentPlanet?.group.position.clone() ?? new THREE.Vector3(500, 250, 500);
    const endLookAt = this.currentPlanet?.group.position ?? new THREE.Vector3(0, 0, 0);

    if(this.currentPlanet) {
      const meshSize = this.currentPlanet?.mesh.geometry.parameters.radius ?? 0;

      if(this.isCameraTransitioning) {
        // カメラ移動中はカメラの向きを変える
        const offsetVector = startPosition.clone().sub(endLookAt).normalize().multiplyScalar(meshSize * 5 + 10);
        endPosition.add(offsetVector);

        // やや俯瞰にする
        const threshold = meshSize * 1.5;
        if(endPosition.y < ( threshold )) {
          endPosition.y = threshold;
        }
      } else {
        // カメラ相対位置固定はカメラの向きを変えない
        const offsetVector = startPosition.clone().sub(startLookAt).normalize().multiplyScalar(meshSize * 5 + 10);
        endPosition.add(offsetVector);
      }
    }
    this.controls.target.set(endLookAt.x, endLookAt.y, endLookAt.z);
    const endDirection = new THREE.Vector3(0, 0, 0);
    endDirection.copy(endLookAt).sub(endPosition).normalize();

    return { startPosition, startLookAt, startDirection, endPosition, endLookAt, endDirection };
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
    const sun = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(6960, 'sun')), new THREE.MeshStandardMaterial({ color: 0xffee00 }));
    sun.setRotation(0.00563, new THREE.Vector3(0, 1, 0));
    sun.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(7.25));
    sun.setEmissive({ color: new THREE.Color(0xffee00), intensity: 1.5, map: 'textures/sun.webp' });
    sun.setName('太陽（Sun）');
    sun.mesh.castShadow = false;
    this.planets.push(sun);

    this.scene.add(sun.mesh);
  }

  /**
   * 水星を追加
   */
  addMercury() {
    const mercury = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(24.40)), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.85 }));
    mercury.setRotation(0.0192, new THREE.Vector3(0, 1, 0));
    mercury.setRevolution(0.019862, this.filterRevolutionSize(387.0));
    mercury.setTexture('textures/mercury.webp');
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
    const venus = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(60.52)), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.85 }));
    venus.setRotation(-0.00593, new THREE.Vector3(0, 1, 0));
    venus.setRevolution(0.00512, this.filterRevolutionSize(723.3));
    venus.setTexture('textures/venus.webp');
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
    const earth = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(63.71)), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.85 }));
    earth.setRotation(0.152, new THREE.Vector3(0, 1, 0));
    earth.setRevolution(0.0032, this.filterRevolutionSize(1000), new THREE.Vector3(0, 1, 0));
    earth.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(23.5));
    earth.setTexture('textures/earth.webp');
    earth.setName('地球（Earth）');

    const moon = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(17.38, 'moon')), new THREE.MeshStandardMaterial({ color: 0xffffcc, roughness: 0.85, metalness: 0.85 }));
    moon.setRotation(0.01336, new THREE.Vector3(0, 1, 0));
    moon.setRevolution(0.152, this.filterRevolutionSize(this.filterPlanetSize(3838), 'moon'), new THREE.Vector3(0, 1, 0));
    moon.setTexture('textures/moon.webp');
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
    const mars = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(33.90)), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.85 }));
    mars.setRotation(0.152, new THREE.Vector3(0, 1, 0));
    mars.setRevolution(0.0017, this.filterRevolutionSize(1523.7));
    mars.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(25.19));
    mars.setTexture('textures/mars.webp');
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
    const jupiter = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(699.11)), new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.85 }));
    jupiter.setRotation(0.3648, new THREE.Vector3(0, 1, 0));
    jupiter.setRevolution(0.00027, this.filterRevolutionSize(5203));
    jupiter.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(3.1));
    jupiter.setTexture('textures/jupiter.webp');
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
    const saturn = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(582.32)), new THREE.MeshStandardMaterial({ color: 0xffeedd, roughness: 0.85, metalness: 0.85 }));
    saturn.setRotation(0.3648, new THREE.Vector3(0, 1, 0));
    saturn.setRevolution(0.0001086, this.filterRevolutionSize(9538.8));
    saturn.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(26.7));
    saturn.setTexture('textures/saturn.webp');
    saturn.setName('土星（Saturn）');

    const ring = new PlanetaryObject(new THREE.TorusGeometry(this.filterPlanetSize(582.32, 'ringSize'), this.filterPlanetSize(583.32,'ringWidth')), new THREE.MeshStandardMaterial({ color: 0xcc9966, opacity: 0.7, transparent: true, roughness: 0.85, metalness: 0.85 }));
    ring.mesh.scale.set(1,1,0.1);
    ring.setRotation(0.01, new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(5.0)), 0, Math.cos(THREE.MathUtils.degToRad(5.0))));
    ring.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(90));
    ring.setTexture('textures/saturn.webp');

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
    const uranus = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(253.62)), new THREE.MeshStandardMaterial({ color: 0x88ddff, roughness: 0.85, metalness: 0.85 } ));
    uranus.setRotation(0.20267, new THREE.Vector3(0, 1, 0));
    uranus.setRevolution(0.00003808, this.filterRevolutionSize(19191.4));
    uranus.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(98));
    uranus.setTexture('textures/uranus.webp');
    uranus.setName('天王星（Uranus）');

    const ring = new PlanetaryObject(new THREE.TorusGeometry(this.filterPlanetSize(253.62, 'ringSize'), this.filterPlanetSize(253.62,'ringWidth')), new THREE.MeshStandardMaterial({ color: 0xeeddee, opacity: 0.7, transparent: true, roughness: 0.85, metalness: 0.85 }));
    ring.mesh.scale.set(1,1,0.1);
    ring.setRotation(0.01, new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(-5.0)), 0, Math.cos(THREE.MathUtils.degToRad(-5.0))));
    ring.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(0));
    ring.setTexture('textures/uranus.webp');

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
    const neptune = new PlanetaryObject(new THREE.SphereGeometry(this.filterPlanetSize(246.22)), new THREE.MeshStandardMaterial({ color: 0x0000ff, roughness: 0.85, metalness: 0.85 }));
    neptune.setRotation(0.228, new THREE.Vector3(0, 1, 0));
    neptune.setRevolution(0.0000194, this.filterRevolutionSize(30061.1));
    neptune.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(28.3));
    neptune.setTexture('textures/neptune.webp');
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
    const texture = new THREE.TextureLoader().load('textures/space.webp');
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.generateMipmaps = true;
    // // ShaderMaterialを使用しない場合
    // const backgroundSphereMaterial = new THREE.MeshBasicMaterial({
    //   color: 0x444444,
    //   opacity: 0.8,
    //   transparent: true,
    //   side: THREE.BackSide
    // });
    // backgroundSphereMaterial.map = new THREE.TextureLoader().load('textures/space.webp');

    // ShaderMaterialを使用する場合
    const backgroundSphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
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
          gl_FragColor.a = 0.06;
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
}
