import * as THREE from 'three'

// Cámara en tercera persona que sigue al coche con suavizado y no atraviesa el terreno.
export class CamaraPersecucion {
  constructor(camara, terreno) {
    this.cam = camara
    this.terreno = terreno
    this.pos = new THREE.Vector3(0, 30, -40)
    this.mira = new THREE.Vector3()
    this._d = new THREE.Vector3()
    this._m = new THREE.Vector3()
  }

  seguir(dt, coche) {
    const f = coche.adelante
    const dist = 9.5 + Math.abs(coche.vel) * 0.09
    const deseada = this._d.copy(coche.pos).addScaledVector(f, -dist)
    deseada.y += 3.8 + Math.abs(coche.vel) * 0.02
    deseada.y = Math.max(deseada.y, this.terreno.altura(deseada.x, deseada.z) + 1.8)

    this.pos.lerp(deseada, 1 - Math.exp(-5 * dt))
    this.pos.y = Math.max(this.pos.y, this.terreno.altura(this.pos.x, this.pos.z) + 1.5)

    const objetivo = this._m.copy(coche.pos).addScaledVector(f, 4)
    objetivo.y += 1.4
    this.mira.lerp(objetivo, 1 - Math.exp(-9 * dt))

    // Pequeña sacudida al chocar
    this.cam.position.copy(this.pos)
    if (coche.choque > 0) this.cam.position.addScalar((Math.random() - 0.5) * coche.choque)
    this.cam.lookAt(this.mira)

    const fov = 58 + Math.min(14, Math.abs(coche.vel) * 0.4)
    if (Math.abs(this.cam.fov - fov) > 0.05) {
      this.cam.fov += (fov - this.cam.fov) * (1 - Math.exp(-4 * dt))
      this.cam.updateProjectionMatrix()
    }
  }

  // Coloca la cámara de golpe detrás del coche (tras teletransportarlo)
  saltar(coche) {
    const f = coche.adelante
    this.pos.copy(coche.pos).addScaledVector(f, -9.5)
    this.pos.y = Math.max(coche.pos.y + 3.8, this.terreno.altura(this.pos.x, this.pos.z) + 1.8)
    this.mira.copy(coche.pos).addScaledVector(f, 4)
    this.mira.y += 1.4
  }

  // Vuelta lenta alrededor del coche para la pantalla de inicio
  orbitar(t, coche) {
    const a = t * 0.12
    this.pos.set(coche.pos.x + Math.sin(a) * 22, coche.pos.y + 8, coche.pos.z + Math.cos(a) * 22)
    this.pos.y = Math.max(this.pos.y, this.terreno.altura(this.pos.x, this.pos.z) + 2)
    this.mira.copy(coche.pos).setY(coche.pos.y + 1)
    this.cam.position.copy(this.pos)
    this.cam.lookAt(this.mira)
  }
}
