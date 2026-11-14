import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

// Cielo físico, iluminación con sombras y niebla.
export function crearEntorno(scene, renderer) {
  const sol = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(145))

  const cielo = new Sky()
  cielo.scale.setScalar(6000)
  const u = cielo.material.uniforms
  u.turbidity.value = 5
  u.rayleigh.value = 1.4
  u.mieCoefficient.value = 0.004
  u.mieDirectionalG.value = 0.85
  u.sunPosition.value.copy(sol)
  scene.add(cielo)

  // Iluminación ambiental a partir del propio cielo (reflejos en coche y agua)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const escenaCielo = new THREE.Scene()
  escenaCielo.add(cielo.clone())
  scene.environment = pmrem.fromScene(escenaCielo).texture
  scene.environmentIntensity = 0.55
  pmrem.dispose()

  scene.fog = new THREE.Fog(0xbcd0e0, 320, 1400)

  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x50602e, 0.45)
  scene.add(hemi)

  const luz = new THREE.DirectionalLight(0xfff0dc, 3.2)
  luz.castShadow = true
  luz.shadow.mapSize.set(2048, 2048)
  const c = luz.shadow.camera
  c.left = c.bottom = -90
  c.right = c.top = 90
  c.near = 10
  c.far = 600
  luz.shadow.bias = -0.0004
  luz.shadow.normalBias = 0.06
  scene.add(luz, luz.target)

  // La sombra sigue al coche (solo se calcula alrededor de él)
  function seguir(pos) {
    luz.target.position.copy(pos)
    luz.position.copy(pos).addScaledVector(sol, 300)
  }

  return { seguir }
}
