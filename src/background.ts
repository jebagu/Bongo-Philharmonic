import * as THREE from 'three';
import { ThemeScenery } from '../foundation/src/view/art/ThemeScenery';
import type { ThemePresentation } from '../foundation/src/view/art/themePresentation';
import { SCENERY_FOCUS_LAYER } from '../foundation/src/view/art/SceneryFocus';

/** The sky has its own camera and lights, so turning or zooming the globe cannot change it. */
export class ComposerBackground {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 40);
  private readonly scenery = new ThemeScenery();
  private readonly ambient = new THREE.AmbientLight();
  private readonly key = new THREE.DirectionalLight();
  private readonly fill = new THREE.DirectionalLight();
  private readonly material = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, fireflies: { value: 0 }, pixelRatio: { value: 1 }, viewport: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `attribute float seed; uniform float time; uniform float fireflies;
      uniform float pixelRatio; uniform vec2 viewport; varying float brightness;
      void main(){
        float phase=seed*73.1;
        vec2 drift=vec2(sin(time*.23+phase)*34.,cos(time*.18+phase*1.7)*26.);
        vec2 point=position.xy+fireflies*drift/viewport*2.;
        gl_Position=vec4(point,.99,1.);
        gl_PointSize=mix(2.5+seed*3.5,24.+seed*16.,fireflies)*pixelRatio;
        brightness=mix(.45+seed*.55,.7+.3*sin(time*(.9+seed)+phase),fireflies);
      }`,
    fragmentShader: `uniform float fireflies; varying float brightness;
      void main(){
        float radius=length(gl_PointCoord-.5)*2.;
        float core=1.-smoothstep(.04,mix(.38,.16,fireflies),radius);
        float glow=exp(-radius*radius*mix(7.,5.,fireflies))*.4;
        float alpha=(core+glow)*brightness;
        if(radius>1.||alpha<.008)discard;
        vec3 color=mix(vec3(.69,.80,1.),vec3(1.,.76,.25),fireflies);
        gl_FragColor=vec4(mix(color,vec3(1.,1.,.85),core*.65),alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  private readonly particles: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private readonly bufferSize = new THREE.Vector2();
  private themeId = 'original';

  constructor() {
    const positions: number[] = [], seeds: number[] = [];
    for (let i = 0; i < 180; i++) {
      positions.push(((i * .61803398875 + .07) % 1) * 1.96 - .98, ((i * .754877666 + .11) % 1) * 1.96 - .98, 0);
      seeds.push((i * .41421356237 + .13) % 1);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1));
    this.particles = new THREE.Points(geometry, this.material);
    this.particles.frustumCulled = false;
    this.particles.name = 'Background stars and fireflies';
    this.camera.position.z = 3.5;
    this.camera.updateMatrixWorld();
    for (const light of [this.ambient, this.key, this.fill]) light.layers.enable(SCENERY_FOCUS_LAYER);
    this.scene.add(this.scenery, this.particles, this.ambient, this.key, this.fill);
  }

  apply(theme?: ThemePresentation) {
    this.themeId = theme?.id ?? 'original';
    this.scenery.apply(theme);
    const fireflies = this.themeId === 'firefly-garden';
    this.particles.visible = fireflies || this.themeId === 'original';
    this.particles.geometry.setDrawRange(0, fireflies ? 72 : 180);
    this.material.uniforms.fireflies.value = Number(fireflies);
    if (theme) {
      this.ambient.color.set(theme.lights.ambient); this.ambient.intensity = theme.lights.ambientPower;
      this.key.color.set(theme.lights.key); this.key.intensity = theme.lights.keyPower; this.key.position.set(...theme.lights.keyPosition);
      this.fill.color.set(theme.lights.fill); this.fill.intensity = theme.lights.fillPower; this.fill.position.set(...theme.lights.fillPosition);
    }
  }

  render(renderer: THREE.WebGLRenderer, foreground: THREE.Scene, camera: THREE.OrthographicCamera, time: number, reducedMotion: boolean, width: number, height: number) {
    // This fixed projection also keeps the nebula's lighting and apparent scale independent of globe zoom.
    const aspect = width / height, halfHeight = 1.42 / Math.min(1, aspect);
    Object.assign(this.camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    this.camera.updateProjectionMatrix();
    this.material.uniforms.time.value = reducedMotion ? 0 : time;
    this.material.uniforms.pixelRatio.value = renderer.getPixelRatio();
    this.material.uniforms.viewport.value.set(width, height);
    if (this.scenery.visible) {
      this.scenery.tick(reducedMotion ? 0 : time, reducedMotion, this.camera.quaternion, {
        camera: this.camera, foreground: [], viewportHeight: height, bufferSize: renderer.getDrawingBufferSize(this.bufferSize),
      });
      // Use the globe camera only for its silhouettes, then draw the sky with the fixed camera.
      this.scenery.renderMask(renderer, foreground, camera);
      this.scenery.renderBackground(renderer, this.scene, this.camera);
    } else renderer.render(this.scene, this.camera);
  }

  dispose() { this.scenery.dispose(); this.particles.geometry.dispose(); this.material.dispose(); }
}
