export class Scene3D {
  constructor(container) { this.container = container; this.initTried = false; this.quality = 'balanced'; this.animationOn = false; }
  init() {
    if (this.initTried) return; this.initTried = true;
    if (!window.THREE) { this.container.innerHTML = 'Three.js missing'; return; }
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color(0x070b14);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500); this.camera.position.set(9, 8, 13);
    this.renderer = new THREE.WebGLRenderer({ antialias: true }); this.renderer.setSize(100, 100);
    this.container.appendChild(this.renderer.domElement);
    this.controls = THREE.OrbitControls ? new THREE.OrbitControls(this.camera, this.renderer.domElement) : null;
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.72));
    this.exprGroup = new THREE.Group(); this.scene.add(this.exprGroup);
    this._animate();
  }
  _animate() {
    if (!this.renderer) return; requestAnimationFrame(() => this._animate());
    if (this.container.offsetParent === null) return; // 3D tab is hidden: don't burn GPU
    if (this.controls) this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  resize() {
    if (!this.renderer) return; // init() bailed out (Three.js not loaded) or hasn't run yet
    const r = this.container.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return;
    this.camera.aspect = r.width / r.height; this.camera.updateProjectionMatrix(); this.renderer.setSize(r.width, r.height);
  }
  rebuild() { /* clear and re-add meshes based on expressions */ }
}