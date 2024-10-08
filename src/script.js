import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/Addons.js";
import { RenderPass } from "three/examples/jsm/Addons.js";
import { DotScreenPass } from "three/examples/jsm/Addons.js";
import { GlitchPass } from "three/examples/jsm/Addons.js";
import { ShaderPass } from "three/examples/jsm/Addons.js";
import { RGBShiftShader } from "three/examples/jsm/Addons.js";
import { GammaCorrectionShader } from "three/examples/jsm/Addons.js";
import { SMAAPass } from "three/examples/jsm/Addons.js";
import { UnrealBloomPass } from "three/examples/jsm/Addons.js";
import GUI from "lil-gui";

/**
 * Base
 */
// Debug
const gui = new GUI();

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
const gltfLoader = new GLTFLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();
const textureLoader = new THREE.TextureLoader();

/**
 * Update all materials
 */
const updateAllMaterials = () => {
  scene.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial
    ) {
      child.material.envMapIntensity = 2.5;
      child.material.needsUpdate = true;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
};

/**
 * Environment map
 */
const environmentMap = cubeTextureLoader.load([
  "/textures/environmentMaps/0/px.jpg",
  "/textures/environmentMaps/0/nx.jpg",
  "/textures/environmentMaps/0/py.jpg",
  "/textures/environmentMaps/0/ny.jpg",
  "/textures/environmentMaps/0/pz.jpg",
  "/textures/environmentMaps/0/nz.jpg",
]);

scene.background = environmentMap;
scene.environment = environmentMap;

/**
 * Models
 */
gltfLoader.load("/models/DamagedHelmet/glTF/DamagedHelmet.gltf", (gltf) => {
  gltf.scene.scale.set(2, 2, 2);
  gltf.scene.rotation.y = Math.PI * 0.5;
  scene.add(gltf.scene);

  updateAllMaterials();
});

/**
 * Lights
 */
const directionalLight = new THREE.DirectionalLight("#ffffff", 3);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.normalBias = 0.05;
directionalLight.position.set(0.25, 3, -2.25);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //update effect composer
  effectComposser.setSize(sizes.width, sizes.height);
  effectComposser.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(4, 1, -4);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Post Processing
 */

//Render Target
const renderTarget = new THREE.WebGLRenderTarget(800, 600, {
  samples: renderer.getPixelRatio() === 1 ? 2 : 0,
});

const effectComposser = new EffectComposer(renderer, renderTarget);
effectComposser.setPixelRatio(Math.min(window.devicePixelRatio, 2));
effectComposser.setSize(sizes.width, sizes.height);

//renderPass
const renderPass = new RenderPass(scene, camera);
effectComposser.addPass(renderPass);

//dotScreenPass
const dotScreenPass = new DotScreenPass();
dotScreenPass.enabled = false;
effectComposser.addPass(dotScreenPass);

//glitchPass
const glitchPass = new GlitchPass();
glitchPass.goWild = false;
glitchPass.enabled = false;
effectComposser.addPass(glitchPass);

//rgbShiftPass
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.enabled = false;
effectComposser.addPass(rgbShiftPass);

//Unreal Bloom Pass
const unrealBloomPass = new UnrealBloomPass();
unrealBloomPass.enabled = false;
effectComposser.addPass(unrealBloomPass);
unrealBloomPass.strength = 0.3;
unrealBloomPass.radius = 1;
unrealBloomPass.threshold = 0.6;

gui.add(dotScreenPass, "enabled").name("DotScreenPass");
gui.add(glitchPass, "enabled").name("GlitchPass");
gui.add(glitchPass, "goWild").name("GlitchPass-goWild");
gui.add(rgbShiftPass, "enabled").name("rgbShiftPass");
gui.add(unrealBloomPass, "enabled").name("UnrealBloomPass");
gui
  .add(unrealBloomPass, "strength")
  .min(0)
  .max(2)
  .step(0.001)
  .name("BloomStrength");
gui
  .add(unrealBloomPass, "radius")
  .min(0)
  .max(2)
  .step(0.001)
  .name("BloomRadius");
gui
  .add(unrealBloomPass, "threshold")
  .min(0)
  .max(2)
  .step(0.001)
  .name("BloomThreshold");

//Tint Pass
const TintShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTint: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}
  `,
  fragmentShader: `
  uniform sampler2D tDiffuse;
  uniform vec3 uTint;

  varying vec2 vUv;

  void main()
{
    vec4 color = texture2D( tDiffuse, vUv );
    color.rgb += uTint;
    gl_FragColor = color;
}
  `,
};
const tintPass = new ShaderPass(TintShader);
tintPass.material.uniforms.uTint.value = new THREE.Vector3();
effectComposser.addPass(tintPass);

gui.add(tintPass.material.uniforms.uTint.value, "x", -1, 1, 0.001).name("red");
gui
  .add(tintPass.material.uniforms.uTint.value, "y", -1, 1, 0.001)
  .name("green");
gui.add(tintPass.material.uniforms.uTint.value, "z", -1, 1, 0.001).name("blue");

//Drunk Displacement Pass
const DisplacementShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}
  `,
  fragmentShader: `
  uniform sampler2D tDiffuse;
  uniform float uTime;

  varying vec2 vUv;

  void main()
{
  vec2 newUv = vec2 (
    vUv.x,
    vUv.y + sin(vUv.x * 10.0 + uTime) * 0.1
  );
  vec4 color = texture2D( tDiffuse, newUv );
  gl_FragColor = color;
}
  `,
};
const displacementPass = new ShaderPass(DisplacementShader);
displacementPass.material.uniforms.uTime.value = 0;
displacementPass.enabled = false;
effectComposser.addPass(displacementPass);

gui.add(displacementPass, "enabled").name("DrunkDispPass");

//textured Displacement Pass
const TextureDisplacementShader = {
  uniforms: {
    tDiffuse: { value: null },
    uNormalMap: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    vUv = uv;
}
  `,
  fragmentShader: `
  uniform sampler2D tDiffuse;
  uniform sampler2D uNormalMap;

  varying vec2 vUv;

  void main()
{
  vec3 normalColor = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  vec2 newUv = vUv + normalColor.xy * 0.1;
  vec4 color = texture2D( tDiffuse, newUv );

  vec3 lightDirection = normalize(vec3(-1.0, 1.0, 0.0));
  float lightness = clamp(dot(normalColor, lightDirection), 0.0, 1.0);
  color.rgb += lightness * 2.0; 
  gl_FragColor = color;
}
  `,
};
const textureDisplacementPass = new ShaderPass(TextureDisplacementShader);
textureDisplacementPass.material.uniforms.uNormalMap.value = textureLoader.load(
  "./textures/interfaceNormalMap.png"
);
textureDisplacementPass.enabled = false;
effectComposser.addPass(textureDisplacementPass);

gui.add(textureDisplacementPass, "enabled").name("textureDisplacementPass");

//Gama correction Pass
const gamaCorrectionPass = new ShaderPass(GammaCorrectionShader);
effectComposser.addPass(gamaCorrectionPass);

//SMAA Pass
if (renderer.getPixelRatio() === 1 && !renderer.capabilities.isWebGL2) {
  const smaaPass = new SMAAPass();
  effectComposser.addPass(smaaPass);
}

/**
 * Animate
 */
const clock = new THREE.Clock();

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  //Update displacement pass
  displacementPass.material.uniforms.uTime.value = elapsedTime;

  // Update controls
  controls.update();

  // Render
  // renderer.render(scene, camera);
  effectComposser.render();

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
