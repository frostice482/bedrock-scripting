import { world } from '@minecraft/server'

console.log('Hello World!')

world.afterEvents.playerSpawn.subscribe(event => {
	world.sendMessage(`Hello, ${event.playerName}!`)
})
