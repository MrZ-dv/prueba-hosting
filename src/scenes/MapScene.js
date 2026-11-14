import Phaser from 'phaser'

const MUNDO = 2000
const RADIO_PUNTO = 30
const NOMBRES = ['Garaje', 'Tienda', 'Taller', 'Gasolinera', 'Estado Supabase']
const COLORES = [0xf4b400, 0x4285f4, 0xab47bc, 0xff7043, 0x00c853]

// Genera un mapa aleatorio: manchas decorativas, obstáculos y puntos de interés.
function generarMapa() {
  const rnd = Phaser.Math.Between
  const lejos = (x, y, lista, d) => lista.every((o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) > d)

  const manchas = Array.from({ length: 25 }, () => ({
    x: rnd(0, MUNDO), y: rnd(0, MUNDO), w: rnd(80, 300), h: rnd(60, 220),
    color: Phaser.Utils.Array.GetRandom([0x2f6b38, 0x4b8f52, 0xc2b280, 0x4fa3d1]),
  }))

  const inicio = { x: MUNDO / 2, y: MUNDO / 2 }
  const puntos = []
  while (puntos.length < NOMBRES.length) {
    const x = rnd(150, MUNDO - 150), y = rnd(150, MUNDO - 150)
    if (lejos(x, y, puntos, 350) && lejos(x, y, [inicio], 150)) {
      puntos.push({ x, y, nombre: NOMBRES[puntos.length], color: COLORES[puntos.length] })
    }
  }

  const obstaculos = []
  let intentos = 0
  while (obstaculos.length < 70 && intentos++ < 5000) {
    const x = rnd(40, MUNDO - 40), y = rnd(40, MUNDO - 40)
    if (lejos(x, y, puntos, 110) && lejos(x, y, [inicio], 120) && lejos(x, y, obstaculos, 60)) {
      obstaculos.push({ x, y, tipo: Math.random() < 0.6 ? 'arbol' : 'roca' })
    }
  }

  return { manchas, puntos, obstaculos, coche: { ...inicio, angulo: 0 } }
}

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene')
  }

  create() {
    // El mapa se genera una vez por carga de página y se guarda para volver del menú igual.
    if (!this.registry.has('mapa')) this.registry.set('mapa', generarMapa())
    const mapa = this.registry.get('mapa')

    this.crearTexturas()
    this.physics.world.setBounds(0, 0, MUNDO, MUNDO)

    // Suelo con cuadrícula + manchas decorativas
    this.add.tileSprite(0, 0, MUNDO, MUNDO, 'suelo').setOrigin(0)
    const g = this.add.graphics()
    for (const m of mapa.manchas) g.fillStyle(m.color, 0.6).fillEllipse(m.x, m.y, m.w, m.h)

    // Obstáculos con colisión
    this.obstaculos = this.physics.add.staticGroup()
    for (const o of mapa.obstaculos) {
      const s = this.obstaculos.create(o.x, o.y, o.tipo)
      if (o.tipo === 'arbol') s.setCircle(16, 4, 4)
    }

    // Puntos de interés
    for (const p of mapa.puntos) {
      const c = this.add.circle(p.x, p.y, RADIO_PUNTO, p.color, 0.85).setStrokeStyle(4, 0xffffff)
      c.setInteractive({ useHandCursor: true })
      c.punto = p
      this.tweens.add({ targets: c, scale: 1.15, duration: 700, yoyo: true, repeat: -1 })
      this.add.text(p.x, p.y - RADIO_PUNTO - 14, p.nombre, {
        fontFamily: 'system-ui, sans-serif', fontSize: '16px', color: '#fff', stroke: '#000', strokeThickness: 4,
      }).setOrigin(0.5)
    }

    // Coche
    this.coche = this.physics.add.sprite(mapa.coche.x, mapa.coche.y, 'coche')
    this.coche.setRotation(mapa.coche.angulo).setCollideWorldBounds(true)
    this.coche.body.setSize(26, 26)
    this.physics.add.collider(this.coche, this.obstaculos)
    this.velocidad = 0
    this.destino = null // { x, y, punto? }

    // Cámara
    this.cameras.main.setBounds(0, 0, MUNDO, MUNDO).startFollow(this.coche, true, 0.1, 0.1)

    // Controles
    this.teclas = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,A,S,D')
    this.marca = this.add.circle(0, 0, 8, 0xffffff, 0.8).setVisible(false)
    this.input.on('pointerdown', (pointer, objetos) => {
      const obj = objetos.find((o) => o.punto)
      this.destino = obj
        ? { x: obj.punto.x, y: obj.punto.y, punto: obj.punto }
        : { x: pointer.worldX, y: pointer.worldY }
      this.marca.setPosition(this.destino.x, this.destino.y).setVisible(!obj)
    })

    // Si el coche empieza encima de un punto no se reabre el menú hasta salir de él.
    this.dentroDe = this.puntoBajoCoche()

    this.add.text(12, 12, 'Flechas/WASD para conducir · Clic para ir a un sitio · Clic en un círculo para entrar', {
      fontFamily: 'system-ui, sans-serif', fontSize: '14px', color: '#fff',
      backgroundColor: '#00000088', padding: { x: 8, y: 6 }, wordWrap: { width: this.scale.width - 24 },
    }).setScrollFactor(0).setDepth(10)
  }

  crearTexturas() {
    if (this.textures.exists('coche')) return
    const g = this.make.graphics({ add: false })

    g.fillStyle(0x3a7d44).fillRect(0, 0, 64, 64).lineStyle(1, 0x337040).strokeRect(0, 0, 64, 64)
    g.generateTexture('suelo', 64, 64).clear()

    // Coche mirando a la derecha (rotación 0)
    g.fillStyle(0x212121).fillRect(6, 0, 9, 4).fillRect(6, 22, 9, 4).fillRect(30, 0, 9, 4).fillRect(30, 22, 9, 4)
    g.fillStyle(0xd32f2f).fillRoundedRect(0, 2, 44, 22, 6)
    g.fillStyle(0x90caf9).fillRect(27, 6, 7, 14)
    g.generateTexture('coche', 44, 26).clear()

    g.fillStyle(0x1b5e20).fillCircle(20, 20, 20).fillStyle(0x2e7d32).fillCircle(15, 15, 9)
    g.generateTexture('arbol', 40, 40).clear()

    g.fillStyle(0x757575).fillRoundedRect(0, 0, 36, 28, 8).fillStyle(0x9e9e9e).fillRoundedRect(5, 4, 15, 9, 4)
    g.generateTexture('roca', 36, 28)
    g.destroy()
  }

  puntoBajoCoche() {
    return this.registry.get('mapa').puntos.find(
      (p) => Phaser.Math.Distance.Between(p.x, p.y, this.coche.x, this.coche.y) < RADIO_PUNTO + 10,
    )
  }

  update(_t, dtMs) {
    const dt = dtMs / 1000
    const k = this.teclas
    const acelera = k.UP.isDown || k.W.isDown
    const frena = k.DOWN.isDown || k.S.isDown
    const giro = (k.RIGHT.isDown || k.D.isDown ? 1 : 0) - (k.LEFT.isDown || k.A.isDown ? 1 : 0)

    // Tocar el teclado cancela el destino del clic
    if ((acelera || frena || giro !== 0) && this.destino) {
      this.destino = null
      this.marca.setVisible(false)
    }

    if (this.destino) {
      // Conducción automática hacia el destino
      const ang = Phaser.Math.Angle.Between(this.coche.x, this.coche.y, this.destino.x, this.destino.y)
      this.coche.rotation = Phaser.Math.Angle.RotateTo(this.coche.rotation, ang, 4 * dt)
      const dist = Phaser.Math.Distance.Between(this.coche.x, this.coche.y, this.destino.x, this.destino.y)
      this.velocidad = Math.min(260, dist * 3)
      if (dist < 12) {
        if (this.destino.punto) return this.entrar(this.destino.punto)
        this.velocidad = 0
        this.destino = null
        this.marca.setVisible(false)
      }
    } else {
      if (acelera) this.velocidad = Math.min(320, this.velocidad + 400 * dt)
      else if (frena) this.velocidad = Math.max(-150, this.velocidad - 500 * dt)
      else this.velocidad *= 0.95
      this.coche.rotation += giro * 3 * dt * Phaser.Math.Clamp(this.velocidad / 150, -1, 1)
    }

    this.physics.velocityFromRotation(this.coche.rotation, this.velocidad, this.coche.body.velocity)

    // ¿Ha entrado en un punto?
    const p = this.puntoBajoCoche()
    if (p && p !== this.dentroDe) this.entrar(p)
    else if (!p) this.dentroDe = null
  }

  entrar(punto) {
    // Al volver, el coche aparece un poco fuera del punto, en la dirección por la que llegó.
    const ang = Phaser.Math.Angle.Between(punto.x, punto.y, this.coche.x, this.coche.y)
    const mapa = this.registry.get('mapa')
    mapa.coche = {
      x: punto.x + Math.cos(ang) * (RADIO_PUNTO + 45),
      y: punto.y + Math.sin(ang) * (RADIO_PUNTO + 45),
      angulo: ang,
    }
    this.scene.start('MenuScene', { punto })
  }
}
