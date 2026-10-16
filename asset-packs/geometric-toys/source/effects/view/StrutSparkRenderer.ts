import * as THREE from 'three';
import { MAX_VISIBLE_SPARKS, type Spark } from './StrutSparkModel';
import type { SparkStyle } from './art/appearance';

function hazeTexture() {
  const size=32, pixels=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const radius=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1);
    const offset=(y*size+x)*4;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=255;
    pixels[offset+3]=Math.round(Math.max(0,1-radius)**3*255);
  }
  const texture=new THREE.DataTexture(pixels,size,size);
  texture.magFilter=texture.minFilter=THREE.LinearFilter;
  texture.needsUpdate=true;
  return texture;
}

function boltGeometry() {
  return new THREE.ShapeGeometry(new THREE.Shape([
    new THREE.Vector2(-.046,-.006),new THREE.Vector2(.003,.025),
    new THREE.Vector2(-.003,.006),new THREE.Vector2(.046,.016),
    new THREE.Vector2(-.007,-.024),new THREE.Vector2(.002,-.007),
  ]));
}

/** Every style reuses the same bounded meshes and tail buffer. */
export class StrutSparkRenderer extends THREE.Group {
  private texture=hazeTexture();
  private core = new THREE.InstancedMesh(new THREE.SphereGeometry(0.019, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff' }), MAX_VISIBLE_SPARKS);
  private aura = new THREE.InstancedMesh(new THREE.PlaneGeometry(.19,.19), new THREE.MeshBasicMaterial({map:this.texture,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}), MAX_VISIBLE_SPARKS);
  private bolts = new THREE.InstancedMesh(boltGeometry(),new THREE.MeshBasicMaterial({color:'#ffe451',side:THREE.DoubleSide}),MAX_VISIBLE_SPARKS);
  private tails = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8, depthWrite: false }));
  private tailPositions = new Float32Array(MAX_VISIBLE_SPARKS * 32 * 6);
  private scratchMatrix = new THREE.Matrix4();
  private scratchScale = new THREE.Vector3(1, 1, 1);
  private orientation = new THREE.Quaternion();
  private scratchPosition = new THREE.Vector3();
  private axis=new THREE.Vector3();
  private normal=new THREE.Vector3();
  private side=new THREE.Vector3();
  private basis=new THREE.Matrix4();

  constructor() {
    super();
    this.tails.geometry.setAttribute('position', new THREE.BufferAttribute(this.tailPositions, 3).setUsage(THREE.DynamicDrawUsage));
    for (const mesh of [this.core, this.aura, this.bolts]) { mesh.count = 0; mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); }
    this.tails.frustumCulled = false;
    this.tails.geometry.setDrawRange(0, 0);
    this.add(this.tails, this.aura, this.core, this.bolts);
  }

  update(sparks: Spark[], _color: number, glow: number, reducedMotion: boolean, style:SparkStyle='white', cameraRotation?:THREE.Quaternion) {
    this.visible = glow > 0 && !reducedMotion;
    const count = this.visible ? Math.min(sparks.length, MAX_VISIBLE_SPARKS) : 0;
    const lightning=style==='lightning',ember=style==='ember';
    this.aura.material.color.set(ember?'#ff7414':'#ffd52b');
    this.aura.material.opacity=ember?.95:.65;
    this.tails.material.color.set(ember?'#ff8c2a':'#fff17b');
    this.tails.material.opacity=ember?.7:1;
    this.core.material.color.set(ember?'#fff2d7':'#ffffff');
    let offset = 0;
    for (let i = 0; i < count; i++) {
      const spark = sparks[i];
      this.scratchPosition.set(...spark.point);
      this.normal.copy(this.scratchPosition).normalize();
      this.scratchPosition.addScaledVector(this.normal,.012);
      this.scratchMatrix.compose(this.scratchPosition,this.orientation.identity(),this.scratchScale);
      this.core.setMatrixAt(i,this.scratchMatrix);
      this.scratchMatrix.compose(this.scratchPosition,cameraRotation??this.orientation,this.scratchScale);
      this.aura.setMatrixAt(i,this.scratchMatrix);
      if(lightning) {
        this.axis.set(...spark.point).sub(new THREE.Vector3(...spark.tail[0]));
        if(this.axis.lengthSq()<1e-12)this.axis.set(Math.abs(this.normal.x)>.9?0:1,Math.abs(this.normal.x)>.9?1:0,0);
        this.axis.addScaledVector(this.normal,-this.axis.dot(this.normal)).normalize();
        this.side.crossVectors(this.normal,this.axis).normalize();
        this.orientation.setFromRotationMatrix(this.basis.makeBasis(this.axis,this.side,this.normal));
        this.scratchMatrix.compose(this.scratchPosition,this.orientation,this.scratchScale);
        this.bolts.setMatrixAt(i,this.scratchMatrix);
      }
      if(!ember&&!lightning)continue;
      for (let j = 1; j < Math.min(spark.tail.length,9); j++) {
        const from=new THREE.Vector3(...spark.tail[j-1]),to=new THREE.Vector3(...spark.tail[j]);
        const side=new THREE.Vector3().crossVectors(this.normal,to.clone().sub(from)).normalize();
        const steps=lightning?4:1;
        let a=from.clone().addScaledVector(this.normal,.012);
        for(let step=1;step<=steps;step++) {
          const b=from.clone().lerp(to,step/steps).addScaledVector(this.normal,.012);
          if(lightning&&step<steps)b.addScaledVector(side,(step%2?1:-1)*.008);
          this.tailPositions.set(a.toArray(),offset);this.tailPositions.set(b.toArray(),offset+3);offset+=6;a=b;
        }
      }
    }
    this.core.count=lightning?0:count;
    this.aura.count=style==='white'?0:count;
    this.bolts.count=lightning?count:0;
    for(const mesh of [this.core,this.aura,this.bolts])mesh.instanceMatrix.needsUpdate=true;
    this.tails.geometry.attributes.position.needsUpdate = true;
    this.tails.geometry.setDrawRange(0, offset / 3);
  }

  dispose() {
    this.texture.dispose();
    for(const mesh of [this.core,this.aura,this.bolts,this.tails]){mesh.geometry.dispose();mesh.material.dispose();}
    this.removeFromParent();
  }
}
