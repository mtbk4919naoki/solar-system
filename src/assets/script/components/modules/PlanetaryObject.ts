import * as THREE from 'three';
/**
 * 天体オブジェクト
 * 天体のモデルやメッシュを管理するクラス
 */
export default class PlanetaryObject<T extends THREE.BufferGeometry, U extends THREE.Material & { map?: THREE.Texture | null }> {
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  private geometry: T;
  private material: U;
  private rotation: {
    speed: number;
    axis: THREE.Vector3;
  }
  private revolution: {
    speed: number;
    distance: number;
  }
  private satellites: PlanetaryObject<THREE.BufferGeometry, THREE.Material & { map?: THREE.Texture | null }>[] = [];

  constructor(geometry: T, material: U) {
    this.geometry = geometry;
    this.material = material;
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.rotation = {
      speed: 0,
    };
    this.revolution = {
      speed: 0,
      distance: 0,
    };
    this.group = new THREE.Group();
    this.group.add(this.mesh);
  }

  /**
   * テクスチャを設定
   * @param path テクスチャのパス
   */
  public setTexture(path: string) {
    const texture = new THREE.TextureLoader().load(path);
    this.material.map = texture;
  }

  /**
   * 自転
   * @param speed 自転速度
   * @param axis 自転軸
   */
  public setRotation(speed: number, axis: THREE.Vector3) {
    this.rotation = {
      speed,
      axis
    };
  }

  /**
   * 軸傾斜
   * @param axis 軸
   * @param tilt 傾斜
   */
  public setAxisTilt(axis: THREE.Vector3, tilt: number) {
    this.mesh.rotateOnAxis(axis, tilt);
  }

  /**
   * 公転
   * @param speed 公転速度
   * @param distance 公転距離
   * @param axis 公転軸
   */
  public setRevolution(speed: number, distance: number) {
    this.revolution = {
      speed,
      distance
    };
  }

  public addSatellite(satellite: PlanetaryObject<THREE.BufferGeometry, THREE.Material & { map?: THREE.Texture | null }>) {
    this.group.add(satellite.group);
    this.satellites.push(satellite);
  }

  /**
   * 更新
   * @param deltaTime デルタタイム
   */
  public update(deltaTime: number) {
    if (this.rotation.speed !== 0) {
      this.mesh.setRotationFromAxisAngle(this.rotation.axis, this.rotation.speed * deltaTime);
    }
    if (this.revolution.speed !== 0) {
      this.group.position.x = Math.sin(this.revolution.speed * deltaTime) * this.revolution.distance;
      this.group.position.z = Math.cos(this.revolution.speed * deltaTime) * this.revolution.distance;
    }
    this.satellites.forEach(satellite => {
      satellite.update(deltaTime);
    });
  }
}