import Phaser from 'phaser'
import { MapScene } from './scenes/MapScene.js'
import { MenuScene } from './scenes/MenuScene.js'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#3a7d44',
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  physics: { default: 'arcade', arcade: { debug: false } },
  scene: [MapScene, MenuScene],
})
