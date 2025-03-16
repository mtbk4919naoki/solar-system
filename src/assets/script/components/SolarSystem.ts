import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import PlanetaryObject from './modules/PlanetaryObject';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import clamp from '@assets/script/library/clamp';
import { PLANET_DATA, type PlanetData } from '@assets/script/components/variables/PLANET_DATA';

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
  private planets: PlanetaryObject<THREE.SphereGeometry, THREE.MeshStandardMaterial>[];
  private backgroundSphere: THREE.Mesh;
  private currentPlanet: PlanetaryObject<THREE.SphereGeometry, THREE.MeshStandardMaterial> | null;
  private pause: boolean;
  private reverse: boolean;
  private frameMultiplier: number;
  private frame: number;
  private alpha: number;
  private easing: number;

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
    this.alpha = 0.1;
    this.easing = 0;
    this.controls = this.addControls();
    this.backgroundSphere = this.addBackgroundSphere();
    this.currentPlanet = null;
    this.pause = false;
    this.reverse = false;
    this.frameMultiplier = 1;
    this.planets = [];
    this.frame = -5113000; // いい感じに全部の惑星が画角に収まる

    this.lights = this.addLight();

    this.helpers = this.addHelper()
    this.hideHelper();
    this.orbitCurves = [];

    PLANET_DATA.forEach(planetData => {
      this.addPlanet(planetData);
    });
    
    this.addStars();
    this.addFog();

    this.setFrameMultiplier(1);

    this.composer = this.setComposer();
    this.handleResize();
    this.render();
    // renderの後にやらないとうまくいかない
    this.switchCameraMode(0);

    // ウィンドウのリサイズ時の処理
    window.addEventListener('resize', () => {
      this.handleResize();
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
      const speed = this.frameMultiplier * (1 - this.easing) * (this.reverse ? -1 : 1);
      this.frame += speed;
      // 惑星（衛星）の更新
      this.planets.forEach(planet => {
        planet.update(this.frame, speed);
      });
    }
    
    this.backgroundSphere.position.copy(this.camera.position);
    
    // カメラ制御
    if(this.isCameraTransitioning) {
      // カメラ移動中
      this.smoothCameraTransition();
      this.easing = clamp(this.easing + 0.01, 0, 1);
    } else if(!this.currentPlanet || this.pause) {
      // 俯瞰モードか一時停止中
      this.easing = clamp(this.easing - 0.01, 0, 1);
    } else {
      // 惑星追従中
      this.relativeCameraTransition();
      this.easing = clamp(this.easing - 0.01, 0, 1);
    }

    this.composer.render();
  }

  handleResize() {
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.composer.setSize(this.width, this.height);
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
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(this.width / 2, this.height / 2), 1.5, 1.5, 0.5));

    return this.composer;
  }

  /**
   * ライトを追加
   * @returns ライト
   */
  addLight() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 7, this.filterDistance(45), 0.10);
    pointLight.position.set(0, 0, 0);
    pointLight.shadow.mapSize.set(4096, 4096);
    pointLight.castShadow = true;

    this.scene.add(pointLight);

    return { ambientLight, pointLight };
  }

  /**
   * カメラを追加
   * @returns カメラ
   */
  addCamera() {
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 10, this.filterDistance(150));
    this.scene.add(this.camera);

    return this.camera;
  }

  /**
   * カメラのモードを切り替え
   */
  switchCameraMode(number: number) {
    this.cameraMode = number;
    this.isCameraTransitioning = true;
    this.alpha = 0.1;
    this.easing = 0;
    const duration = 300;
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
      this.alpha = clamp(progress / duration, 0, 1);
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

    if (position.distanceTo(endPosition) < 0.5) {
      // this.pause = false;
      this.isCameraTransitioning = false;
    }

    // 近づいた時に物体に追いつけないことがあるので、物体の位置に向けてカメラを移動させる
    const offset = endPosition.clone().sub(startPosition).normalize().multiplyScalar(0.5);
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
    const endPosition = this.currentPlanet?.group.position.clone() ?? new THREE.Vector3(400, 200, 400);
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
    if(!this.pause && this.currentPlanet) {
      this.switchCameraMode(this.cameraMode);
    }
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
    this.scene.fog = new THREE.Fog(0x000000, this.filterDistance(10), this.filterDistance(150));
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
   * 惑星の半径をフィルタリング
   * @param number 惑星の半径
   * @returns フィルタリングされた惑星の半径
   */
  filterRadius(number: number, id?: string) {
    return clamp(Math.pow(number, 0.50) * 0.1, 1, 100);
  }

  /**
   * 惑星の距離をフィルタリング
   * @param number 惑星の距離
   * @returns フィルタリングされた惑星の距離
   */
  filterDistance(number: number, id?: string) {
    if(number === 0) return 0;
    return clamp(Math.pow(number, 0.50) * 400 - 100, 25, 10000);
  }

  /**
   * 惑星の公転速度をフィルタリング
   * @param number 惑星の公転周期（日）
   * @returns フィルタリングされた惑星の公転速度
   */
  filterOrbitalSpeed(period: number, id?: string) {
    if(period === 0) return 0;
    return (1 / period) * 1 ;
  }

  /**
   * 惑星の自転速度をフィルタリング
   * @param number 惑星の自転周期（時間）
   * @returns フィルタリングされた惑星の自転速度
   */
  filterRotationSpeed(period: number, id?: string) {
    if(period === 0) return 0;
    return clamp((1 / (period / 24)) * 1, 0, 0.05);
  }

  /**
   * 惑星を追加
   */
  addPlanet(planetData: PlanetData) {
    const geometry = new THREE.SphereGeometry(this.filterRadius(planetData.radius));
    const material = new THREE.MeshStandardMaterial({ color: planetData.map?.color, roughness: 0.85, metalness: 0.85 });
    const planet = new PlanetaryObject(geometry, material);
    planet.setRotation(this.filterRotationSpeed(planetData.rotationPeriod, planetData.id), new THREE.Vector3(0, 1, 0));
    planet.setRevolution(this.filterOrbitalSpeed(planetData.orbitalPeriod, planetData.id), this.filterDistance(planetData.distance), new THREE.Vector3(0, 1, 0));
    planet.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(planetData.axisTilt));
    planet.setName(`${planetData.name.ja}（${planetData.name.en}）`);

    if(planetData.map?.emissive) {
      planet.setEmissive({ color: new THREE.Color(planetData.map.emissive.color), intensity: planetData.map.emissive.intensity, map: planetData.map.src });
      planet.mesh.castShadow = false;
    } else if (planetData.map) {
      planet.setTexture(planetData.map.src);
      planet.mesh.castShadow = true;
    }

    // 衛星を追加
    if(planetData.satellites) {
      planetData.satellites.forEach(satelliteData => {
        let satelliteGeometry: THREE.SphereGeometry | THREE.TorusGeometry;
        let satelliteMaterial: THREE.MeshStandardMaterial;
        let satellite: PlanetaryObject<THREE.SphereGeometry | THREE.TorusGeometry, THREE.MeshStandardMaterial>;
        if(satelliteData.type === 'ring') {
          satelliteGeometry = new THREE.TorusGeometry(this.filterRadius(satelliteData.radius, satelliteData.id) * 1.5, this.filterRadius(satelliteData.radius / 10, satelliteData.id));
          satelliteMaterial = new THREE.MeshStandardMaterial({ color: satelliteData.map?.color, roughness: 0.85, metalness: 0.85, opacity: 0.7, transparent: true });
          satellite = new PlanetaryObject(satelliteGeometry, satelliteMaterial);
          satellite.mesh.scale.set(1,1,0.1);
          satellite.setRotation(this.filterRotationSpeed(satelliteData.rotationPeriod, satelliteData.id), new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(5.0)), 0, Math.cos(THREE.MathUtils.degToRad(5.0))));
          satellite.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(satelliteData.axisTilt));
          satellite.mesh.castShadow = false;
        } else {
          satelliteGeometry = new THREE.SphereGeometry(this.filterRadius(satelliteData.radius, satelliteData.id));
          satelliteMaterial = new THREE.MeshStandardMaterial({ color: satelliteData.map?.color, roughness: 0.85, metalness: 0.85 });
          satellite = new PlanetaryObject(satelliteGeometry, satelliteMaterial);
          satellite.setRotation(this.filterRotationSpeed(satelliteData.rotationPeriod, satelliteData.id), new THREE.Vector3(0, 1, 0));
          satellite.setAxisTilt(new THREE.Vector3(1, 0, 0), THREE.MathUtils.degToRad(satelliteData.axisTilt));
          satellite.mesh.castShadow = true;
        }
        satellite.setRevolution(this.filterOrbitalSpeed(satelliteData.orbitalPeriod, satelliteData.id), this.filterDistance(satelliteData.distance, satelliteData.id), new THREE.Vector3(0, 1, 0));
        if(satelliteData.map?.src) {
          satellite.setTexture(satelliteData.map?.src);
        }
        planet.addSatellite(satellite);
      });
    }

    this.addOrbit(this.filterDistance(planetData.distance, planetData.id));
    this.planets.push(planet); // 惑星を配列に追加
    this.scene.add(planet.group); // 惑星グループをシーンに追加
  }

  /**
   * 星を追加
   */
  addStars() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 3 });
    
    const starVertices = [];
    const maxRadius = this.filterDistance(60);
    const count = 1000;

    for (let i = 0; i < count; i++) {
      // 体積を考慮して均一な分布になるよう半径を調整
      const radius = maxRadius * Math.pow(Math.random(), 1/3);
      const theta = Math.random() * Math.PI * 2;  // 方位角 (0 to 2π)
      const phi = Math.acos(2 * Math.random() - 1);  // 天頂角 (0 to π)

      // 極座標から直交座標に変換
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

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
    const backgroundSphereGeometry = new THREE.SphereGeometry(this.filterDistance(150));
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
          gl_FragColor.a = 0.03;
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
    const axisHelper = new THREE.AxesHelper(this.filterDistance(60, 'axis'));
    const pointLightHelper = new THREE.PointLightHelper(this.lights.pointLight, this.filterRadius(695000, 'pointLight') * 1.41421356);

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
