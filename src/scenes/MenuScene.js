import Phaser from 'phaser'
import { leerSupabase } from '../supabase.js'

const FUENTE = 'system-ui, sans-serif'

const TEXTOS = {
  Garaje: 'Aquí guardarías el coche.\n(Menú de prueba)',
  Tienda: 'Aquí podrías comprar cosas.\n(Menú de prueba)',
  Taller: 'Aquí repararías el coche.\n(Menú de prueba)',
  Gasolinera: 'Aquí llenarías el depósito.\n(Menú de prueba)',
}

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  init(data) {
    this.punto = data.punto
  }

  create() {
    const { width, height } = this.scale
    const cx = width / 2
    const cy = height / 2
    const ancho = Math.min(520, width - 32)
    const color = '#' + this.punto.color.toString(16).padStart(6, '0')

    this.cameras.main.setBackgroundColor('#1e1e1e')
    this.add.rectangle(cx, cy, ancho, 360, 0x2b2b2b).setStrokeStyle(4, this.punto.color)
    this.add.text(cx, cy - 140, this.punto.nombre, { fontFamily: FUENTE, fontSize: '32px', color }).setOrigin(0.5)

    const cuerpo = this.add.text(cx, cy - 20, TEXTOS[this.punto.nombre] ?? 'Consultando Supabase...', {
      fontFamily: FUENTE, fontSize: '16px', color: '#dddddd', align: 'center', wordWrap: { width: ancho - 40 },
    }).setOrigin(0.5)

    if (this.punto.nombre === 'Estado Supabase') {
      leerSupabase().then(({ ok, texto }) => {
        if (!this.sys.isActive()) return
        cuerpo.setText(texto).setColor(ok ? '#69f0ae' : '#ff8a80')
      })
    }

    // Botón volver (también con Esc)
    const boton = this.add.rectangle(cx, cy + 130, 180, 48, 0x424242).setStrokeStyle(2, 0xffffff)
    this.add.text(cx, cy + 130, '← Volver', { fontFamily: FUENTE, fontSize: '20px', color: '#ffffff' }).setOrigin(0.5)
    boton.setInteractive({ useHandCursor: true })
      .on('pointerover', () => boton.setFillStyle(0x616161))
      .on('pointerout', () => boton.setFillStyle(0x424242))
      .on('pointerdown', () => this.volver())
    this.input.keyboard.once('keydown-ESC', () => this.volver())

    // Recolocar si cambia el tamaño de la ventana
    const alRedimensionar = () => this.scene.restart({ punto: this.punto })
    this.scale.once('resize', alRedimensionar)
    this.events.once('shutdown', () => this.scale.off('resize', alRedimensionar))
  }

  volver() {
    this.scene.start('MapScene')
  }
}
