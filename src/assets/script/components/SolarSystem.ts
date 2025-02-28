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
  private planets: PlanetaryObject<THREE.SphereGeometry, THREE.MeshBasicMaterial|THREE.MeshPhongMaterial>[];
  private backgroundSphere: THREE.Mesh;
  private frame: number;

  constructor(container: HTMLElement) {
    this.container = container;
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

    this.planets = [];
    this.frame = 0;

    this.lights = this.addLight();

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

    this.helpers = this.addHelper();

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
      // Zでヘルパーの表示を切り替え
      if (event.key === 'z') {
        this.helpers.axisHelper.visible = !this.helpers.axisHelper.visible;
        this.helpers.pointLightHelper.visible = !this.helpers.pointLightHelper.visible;
      }

      // スペースキーでカメラモードを切り替え
      if (event.key == ' ') {
        event.preventDefault();
        this.cameraMode = (this.cameraMode + 1) % 10;
      }

      // 数字キーでカメラモードを切り替え
      if ( /\d/.test(event.key)) {
        this.cameraMode = parseInt(event.key);
      }
    });
  }

  /**
   * ライトを追加
   * @returns ライト
   */
  addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 10, 10000, 0.15);
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
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 100, 12000);
    this.camera.position.set(0, 2000, 4000);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);

    return this.camera;
  }

  /**
   * フォグを追加
   */
  addFog() {
    this.scene.fog = new THREE.Fog(0x000000, 100, 8000);
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
   * 太陽を追加
   */
  addSun() {
    const sun = new PlanetaryObject(new THREE.SphereGeometry(200), new THREE.MeshBasicMaterial({ color: 0xffee00 }));
    sun.setRotation(-0.01, new THREE.Vector3(0, 1, 0));
    sun.setTexture('textures/sun.jpg');
    sun.mesh.castShadow = false;
    this.planets.push(sun);

    this.scene.add(sun.mesh);
  }

  /**
   * 水星を追加
   */
  addMercury() {
    const mercury = new PlanetaryObject(new THREE.SphereGeometry(20), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    mercury.setRotation(0.4, new THREE.Vector3(0, 1, 0));
    mercury.setRevolution(0.08, 300);
    mercury.setTexture('textures/mercury.jpg');

    this.planets.push(mercury);
    this.scene.add(mercury.group);
  }

  /**
   * 金星を追加
   */
  addVenus() {
    const venus = new PlanetaryObject(new THREE.SphereGeometry(40), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    venus.setRotation(0.2, new THREE.Vector3(0, 1, 0));
    venus.setRevolution(0.05, 600);
    venus.setTexture('textures/venus.jpg');

    this.planets.push(venus);
    this.scene.add(venus.group);
  }

  /**
   * 地球と月を追加
   */
  addEarth() {
    const earth = new PlanetaryObject(new THREE.SphereGeometry(50), new THREE.MeshPhongMaterial({ color: 0xcceeff }));
    earth.setRotation(0.1, new THREE.Vector3(0, 1, 0));
    earth.setRevolution(0.01, 1000);
    earth.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(23.5));
    earth.setTexture('textures/earth.jpg');

    const moon = new PlanetaryObject(new THREE.SphereGeometry(15), new THREE.MeshPhongMaterial({ color: 0xffffcc }));
    moon.setRotation(0.1, new THREE.Vector3(0, 1, 0));
    moon.setRevolution(0.1, 100);
    moon.setTexture('textures/moon.jpg');
    earth.addSatellite(moon);

    this.planets.push(earth);
    this.scene.add(earth.group);
  }

  /**
   * 火星を追加
   */
  addMars() {
    const mars = new PlanetaryObject(new THREE.SphereGeometry(50), new THREE.MeshPhongMaterial({ color: 0xff9933 }));
    mars.setRotation(0.1, new THREE.Vector3(0, 1, 0));
    mars.setRevolution(0.007, 1500);
    mars.setTexture('textures/mars.jpg');

    this.planets.push(mars);
    this.scene.add(mars.group);
  }

  /**
   * 木星を追加
   */
  addJupiter() {
    const jupiter = new PlanetaryObject(new THREE.SphereGeometry(150), new THREE.MeshPhongMaterial({ color: 0xffffff }));
    jupiter.setRotation(0.05, new THREE.Vector3(0, 1, 0));
    jupiter.setRevolution(0.005, 2000);
    jupiter.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(3.1));
    jupiter.setTexture('textures/jupiter.jpg');

    this.planets.push(jupiter);
    this.scene.add(jupiter.group);
  }

  /**
   * 土星を追加
   */
  addSaturn() {
    const saturn = new PlanetaryObject(new THREE.SphereGeometry(70), new THREE.MeshPhongMaterial({ color: 0xffeedd }));
    saturn.setRotation(0.02, new THREE.Vector3(0, 1, 0));
    saturn.setRevolution(0.003, 2500);
    saturn.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(26.7));
    saturn.setTexture('textures/saturn.jpg');

    const saturnRing = new PlanetaryObject(new THREE.TorusGeometry(90, 10), new THREE.MeshPhongMaterial({ color: 0xcc9966 }));
    saturnRing.mesh.scale.set(1,1,0.1);
    saturnRing.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(75));
    saturnRing.setTexture('textures/saturn.jpg');

    saturn.addSatellite(saturnRing);

    this.planets.push(saturn);
    this.scene.add(saturn.group);
  }

  /**
   * 天王星を追加
   */
  addUranus() {
    const uranus = new PlanetaryObject(new THREE.SphereGeometry(50), new THREE.MeshPhongMaterial({ color: 0x88ddff }));
    uranus.setRotation(0.01, new THREE.Vector3(0, 1, 0));
    uranus.setRevolution(0.002, 3000);
    uranus.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(98));
    uranus.setTexture('textures/uranus.jpg');

    this.planets.push(uranus);
    this.scene.add(uranus.group);
  }

  /** 
   * 海王星を追加
   */
  addNeptune() {
    const neptune = new PlanetaryObject(new THREE.SphereGeometry(40), new THREE.MeshPhongMaterial({ color: 0x0000ff }));
    neptune.setRotation(0.01, new THREE.Vector3(0, 1, 0));
    neptune.setRevolution(0.001, 3500);
    neptune.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(28.3));
    neptune.setTexture('textures/neptune.jpg');

    this.planets.push(neptune);
    this.scene.add(neptune.group);
  }

  /**
   * 星を追加
   */
  addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff });
    
    const starVertices = [];
    for (let i = 1000; i > 0; i--) {
      const x = THREE.MathUtils.randFloatSpread(10000);
      const y = THREE.MathUtils.randFloatSpread(10000);
      const z = THREE.MathUtils.randFloatSpread(10000);
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
    const backgroundSphereGeometry = new THREE.SphereGeometry(5000);
    const backgroundSphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x444444,
      opacity: 1,
      transparent: true,
      side: THREE.BackSide
    });
    backgroundSphereMaterial.map = new THREE.TextureLoader().load('textures/space.jpg');
    const backgroundSphere = new THREE.Mesh(backgroundSphereGeometry, backgroundSphereMaterial);

    this.scene.add(backgroundSphere);
    return backgroundSphere;
  }

  /**
   * ヘルパーを追加
   * @returns ヘルパー
   */
  addHelper() {
    const axisHelper = new THREE.AxesHelper(10000);
    const pointLightHelper = new THREE.PointLightHelper(this.lights.pointLight, 300);

    axisHelper.visible = false;
    pointLightHelper.visible = false;

    this.scene.add(axisHelper);
    this.scene.add(pointLightHelper);

    return { axisHelper, pointLightHelper };
  }

  /**
   * レンダリング
   */
  render() {
    requestAnimationFrame(() => this.render());

    this.frame++;

    this.backgroundSphere.position.copy(this.camera.position);

    // 惑星（衛星）の更新
    this.planets.forEach(planet => {
      planet.update(this.frame);
    });

    if(this.cameraMode === 0) {    // カメラのパンを制限
      const maxPanX = 1000;
      const maxPanY = 1000;
      const maxPanZ = 1000;
  
      this.camera.position.x = THREE.MathUtils.clamp(this.camera.position.x, -maxPanX, maxPanX);
      this.camera.position.y = THREE.MathUtils.clamp(this.camera.position.y, -maxPanY, maxPanY);
      this.camera.position.z = THREE.MathUtils.clamp(this.camera.position.z, -maxPanZ, maxPanZ);
      this.controls.update();
    } else {
      const targetPosition = this.planets[this.cameraMode -1].group.position;
      const cameraPosition = targetPosition.clone();
      cameraPosition.y += 500;
      cameraPosition.z += 1000;
      this.camera.position.copy(cameraPosition);
      this.camera.lookAt(targetPosition);
    }
    this.renderer.render(this.scene, this.camera);
  }
}

