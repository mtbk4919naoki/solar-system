import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

export default class SolarSystem {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private geometry: THREE.BoxGeometry;
  private material: THREE.MeshStandardMaterial;
  private mesh: THREE.Mesh;
  private group: THREE.Group;
  private width: number;
  private height: number;
  private frame: number;
  private rotationGroup: THREE.Group;
  private revolutionGroup: THREE.Group;
  private moon: {
    mesh: THREE.Mesh;
    geometry: THREE.SphereGeometry;
    material: THREE.MeshPhongMaterial;
  }
  private sunMesh: THREE.Mesh;
  private fog: THREE.Fog;

  constructor(container: HTMLElement) {
    this.frame = 0;
    this.container = container;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setClearColor(new THREE.Color(0x000000));
    this.renderer.setSize(this.width, this.height);
    this.container.appendChild(this.renderer.domElement);

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, this.width / this.height, 100, 4000);
    this.camera.position.set(500, 500, 0);
    this.camera.lookAt(0, 0, 0);
    this.scene.add(this.camera);

    this.fog = new THREE.Fog(0x000000, 0.1, 2000);
    this.scene.fog = this.fog;

    const earthTexture = new THREE.TextureLoader().load('public/textures/earth.jpg');

    this.geometry = new THREE.SphereGeometry(50,50,50);
    this.material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    this.material.map = earthTexture;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = THREE.MathUtils.degToRad(23.5);
    this.scene.add(this.mesh);

    this.group = new THREE.Group();
    this.group.add(this.mesh);
    this.rotationGroup = new THREE.Group();
    this.rotationGroup.add(this.mesh);
    this.rotationGroup.add(this.group);
    this.revolutionGroup = new THREE.Group();
    this.revolutionGroup.add(this.rotationGroup);
    this.scene.add(this.revolutionGroup);

    this.moon = {
      mesh: new THREE.Mesh(),
      geometry: new THREE.SphereGeometry(10,10,10),
      material: new THREE.MeshPhongMaterial({ color: 0xffee99 }),
    }
    const moonTexture = new THREE.TextureLoader().load('public/textures/moon.jpg');
    this.moon.material.map = moonTexture;
    this.moon.mesh = new THREE.Mesh(this.moon.geometry, this.moon.material);
    this.moon.mesh.position.set(100, 0, 0);
    this.group.add(this.moon.mesh);

    

    const sunTexture = new THREE.TextureLoader().load('public/textures/sun.jpg');
    const sunGeometry = new THREE.SphereGeometry(200,200,200);
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: sunTexture,
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    this.scene.add(this.sunMesh);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
    this.scene.add(ambientLight);

    const light = new THREE.PointLight(0xffffff, 10, 1000, 0);
    light.position.set(0, 0, 0);

    this.scene.add(light);

    const pointLightHelper = new THREE.PointLightHelper(light, 10);
    // this.scene.add(pointLightHelper);

    const axis = new THREE.AxesHelper(1000);
    // this.scene.add(axis);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.width = this.container.offsetWidth;
      this.height = this.container.offsetHeight;
      this.renderer.setSize(this.width, this.height);
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
    }, false);

    this.addStars();
    this.addBackground();

    this.render();
  }

  private addStars() {
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.8,
    });

    const starVertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = THREE.MathUtils.randFloatSpread(2000);
      const y = THREE.MathUtils.randFloatSpread(2000);
      const z = THREE.MathUtils.randFloatSpread(2000);
      starVertices.push(x, y, z);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    const stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(stars);
  }

  private addBackground() {
    const backgroundGeometry = new THREE.SphereGeometry(2000, 2000, 2000);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.5,
      transparent: true,
      side: THREE.BackSide
    });
    const backgroundTexture = new THREE.TextureLoader().load('public/textures/space.jpg');
    backgroundMaterial.map = backgroundTexture;
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.scene.add(background);
  }

  render() {
    this.frame++;
    this.mesh.rotation.y = this.frame * 0.02;
    this.group.rotation.y = this.frame * 0.04;
    this.revolutionGroup.rotation.y = this.frame * 0.01;
    this.rotationGroup.rotation.y = this.frame * -0.01;
    this.rotationGroup.position.x = 500;
    this.sunMesh.rotation.y = this.frame * -0.01;

    requestAnimationFrame(() => this.render());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

