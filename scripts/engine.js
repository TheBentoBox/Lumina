// engine.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {}

game.engine = (function(){
	console.log("loaded engine.js module");
	
	/* VARIABLES */
	//== SCREEN AND AUDIO VARIABLES ==//{
	var windowManager = game.windowManager; // reference to the engine's window manager
	var bgAudio;				// audio player reference for background audio
	var sfxPlayer;				// audio player reference for sound effects
	var canvas, ctx;			// canvas references
	var offCanvas, offCtx;		// offscreen canvas references
	var foreCanvas, foreCtx;	// foreground's canvas
	var mouseX, mouseY;			// mouse coordinates
	var animationID;			// stores animation ID of animation frame
	var mouseDown = false;		// if the mouse is being held down
	var uiClicked = false;		// if UI was clicked
	var enemyHover = false;		// if an enemy is being hovered over
	var mouse = {}				// a mouse object, with screen coordinates
	var worldMouse = {}			// a mouse object, with screen coords transformed to the world's system
	var lastTime = (+new Date); // used with calculateDeltaTime
	var dt = 0;					// delta time
	var time = 0;
	//}
	
	//== ASSETS ==//{
	var boltRune 	  	= new Image();
	var runeRune 	  	= new Image();
	var grenadeRune   	= new Image();
	var fireRune 	  	= new Image();
	var waterRune 	  	= new Image();
	var earthRune 	  	= new Image();
	var emptyRune 	  	= new Image();
	var towerImg		= new Image();
	var towerInterior	= new Image();
	var numImages	  	= 0;
	var numImagesLoaded = 0;
	//}
	
	//== GAME VARIABLES ==//{
	//== General
	var GAME_STATE = {			// "enum" of the current status of the game
		START: 0,				// start screen
		IDLE: 1,				// level is sitting idly
		PAUSED: 2,				// the game is paused
		BETWEEN: 3,				// between level upgrade
		DEAD: 4					// game over screen
	}
	var currentGameState = GAME_STATE.START; // what is currently happening in the game
	var currentLevel = 0;		// what level the player is on
	var keys = [];				// array to store pressed keys
	var experience = 0;			// increases like score, but can be spent for upgrades
	var postProcesses = [];		// an array that stores callbacks to object draws that should be called after shading is applied
	
	//== Progression
	var progression = 0;
	
	//== Player
	var player = {};				// the player object
	var playerRun = new Image();	// the player's run spritesheet
	var playerToIdle = new Image();	// the player's tranisition to idle from run
	//== World
	var TERRAIN_WIDTH = 10;		// width of a terrain tile
	var TERRAIN_HEIGHT = 0; 	// height of terrain from the bottom of the screen
	var LEVEL_WIDTH = 6000;		// width of a level in tiles, pixel width is this*TERRAIN_WIDTH
	var world = [];				// array storing the world map
	var screenX = (LEVEL_WIDTH*TERRAIN_WIDTH)/2 - 640;	// current horizontal position of camera in level
	function levelWidth() { return LEVEL_WIDTH*TERRAIN_WIDTH; }
	var wizardTower = {};		// a reference to the wizard's tower itself
	//== Light Sources
	var lightSources = [];
	// helper functions to get global element light colors
	function globalFire() { return {r: 225, g: 175, b: 20}; };
	function globalWater() { return {r: 20, g: 100, b: 200}; };
	function globalEarth() { return {r: 20, g: 200, b: 50}; };
	function globalLight() { return {r: 250, g: 255, b: 195}; };
	//== Waystones (teleporters)
	var waystones = [];			// list of waystones
	//== Particle Systems
	var particleSystems = [];
	var particles = [];
	var PARTICLE_TYPE = {		// enum storing particle type info
		BURN: {
			collidesTerrain: false,
			lighting: true,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-1, 1)); },
			img: new Image()
		},
		FLAME: {
			collidesTerrain: false,
			lighting: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-1, 1)); },
			img: new Image()
		},
		WATERDRIP: {
			collidesTerrain: true,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(0, 1); },
			img: new Image()
		},
		EARTH: {
			collidesTerrain: true,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, 1)); },
			img: new Image()
		},
		FLAMEFOUNTAIN: {
			collidesTerrain: false,
			lighting: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -10)); },
			img: new Image()
		},
		WATERFOUNTAIN: {
			collidesTerrain: true,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -22)); },
			img: new Image()
		},
		EARTHFOUNTAIN: {
			collidesTerrain: true,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -22)); },
			img: new Image()
		},
		FLAMEEXPLODE: {
			collidesTerrain: false,
			lighting: false,
			gravity: false,
			vel: function() { return new Victor(rand(-10, 10), rand(-10, 10)); },
			img: new Image()
		},
		WATEREXPLODE: {
			collidesTerrain: false,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(rand(-10, 10), rand(-10, 10)); },
			img: new Image()
		},
		EARTHEXPLODE: {
			collidesTerrain: false,
			lighting: false,
			gravity: true,
			vel: function() { return new Victor(rand(-10, 10), rand(-10, 10)); },
			img: new Image()
		}
	}
	//== Projectiles
	var projectiles = [];
	var PROJECTILE_TYPE = {
		FIREBOLT: {
			strength: 10,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: false,
			velocity: 15,
			cost: 10,
			launchSnd: "firebolt.mp3",
			impactSnd: "fireImpact.mp3",
			breakSnd: "glassBreak.mp3",
			color: globalFire(),
			particle: PARTICLE_TYPE.FLAME,
			particleLifetime: 6,
			particlesPerFrame: 3
		},
		WATERBOLT: {
			strength: 7,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: false,
			velocity: 22,
			cost: 7,
			launchSnd: "waterLaunch.mp3",
			impactSnd: "waterImpact.mp3",
			breakSnd: "glassBreak.mp3",
			color: globalWater(),
			particle: PARTICLE_TYPE.WATERDRIP,
			particleLifetime: 20,
			particlesPerFrame: 1
		},
		EARTHBOLT: {
			strength: 20,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: true,
			velocity: 20,
			cost: 20,
			launchSnd: "earthbolt.mp3",
			impactSnd: "earthShatter.mp3",
			breakSnd: "earthGrenade.mp3",
			color: globalEarth(),
			particle: PARTICLE_TYPE.EARTH,
			particleLifetime: -1,
			particlesPerFrame: 0.1
		},
		FIREGRENADE: {
			strength: 26.66,
			img: new Image(),
			width: 55,
			height: 55,
			gravity: true,
			velocity: 13,
			cost: 40,
			color: globalFire(),
			launchSnd: "fireLaunch.mp3",
			impactSnd: "fireImpact.mp3",
			breakSnd: "fireGrenade.mp3",
			particle: PARTICLE_TYPE.FLAME,
			particleExplode: PARTICLE_TYPE.FLAMEEXPLODE,
			particleLifetime: 6,
			particlesPerFrame: 3
		},
		WATERGRENADE: {
			strength: 20,
			img: new Image(),
			width: 75,
			height: 75,
			gravity: true,
			velocity: 15,
			cost: 30,
			color: globalWater(),
			launchSnd: "waterLaunch.mp3",
			impactSnd: "waterImpact.mp3",
			breakSnd: "waterGrenade.mp3",
			particle: PARTICLE_TYPE.WATERDRIP,
			particleExplode: PARTICLE_TYPE.WATEREXPLODE,
			particleLifetime: -1,
			particlesPerFrame: 1
		},
		EARTHGRENADE: {
			strength: 33.33,
			img: new Image(),
			width: 65,
			height: 65,
			gravity: true,
			velocity: 10,
			cost: 50,
			color: globalEarth(),
			launchSnd: "earthLaunch.mp3",
			impactSnd: "earthImpact.mp3",
			breakSnd: "earthGrenade.mp3",
			particle: PARTICLE_TYPE.EARTH,
			particleExplode: PARTICLE_TYPE.EARTHEXPLODE,
			particleLifetime: -1,
			particlesPerFrame: 0.1,
		},
		POISONBOLT: {
			strength: 4,
			img: new Image(),
			width: 16,
			height: 16,
			gravity: false,
			velocity: 12,
			cost: 50,
			color: {r: 100, g: 0, b: 100},
			launchSnd: "whoosh.mp3",
			impactSnd: "",
			breakSnd: "",
			particle: undefined,
			particleExplode: undefined,
			particleLifetime: -1,
			particlesPerFrame: 0.1,
		}
	}
	//== Runes
	var RUNE_TYPE = {
		FIRE: {
			width: 130,
			img: new Image(),
			strength: 25,
			cost: 25,
			color: globalFire(),
			particle: PARTICLE_TYPE.FLAMEFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 3
		},
		WATER: {
			width: 100,
			img: new Image(),
			strength: 30,
			cost: 30,
			color: globalWater(),
			particle: PARTICLE_TYPE.WATERFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 1
		},
		EARTH: {
			width: 160,
			img: new Image(),
			strength: 20,
			cost: 20,
			color: globalEarth(),
			particle: PARTICLE_TYPE.EARTHFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 0.1
		}
	}
	var runes = [];
	//== Enemies
	var enemies = [];			// array storing all enemies
	var enemyLoop = -1;			// the ID of the looping enemy spawn function
	var ENEMY_TYPE = {			// "enum" of the enemy types
		GATOR: {
			name: "Sand Gator",
			health: 75,
			img: new Image(),
			profile: new Image(),
			width: 100,
			height: 60,
			strength: 10,
			AI: "running"
		},
		RAT: {
			name: "Wood Rat",
			health: 55,
			img: new Image(),
			profile: new Image(),
			width: 100,
			height: 50,
			strength: 5,
			AI: "standing"
		},
		BAT: {
			name: "Quill Bat",
			health: 50,
			img: new Image(),
			profile: new Image(),
			width: 85,
			height: 50,
			strength: 3,
			AI: "flying",
			projectile: PROJECTILE_TYPE.POISONBOLT
		}
	}
	//== Biomes
	var BIOME = {
		CLEARING: {
			display: "Clearing",
			id: 2,
			enemies: [],
			environmentImgs: []
		},
		FOREST: {
			display: "Dark Forest",
			id: -1,
			enemies: [ENEMY_TYPE.RAT, ENEMY_TYPE.BAT],
			environmentImgs: [],
			WAYSTONE: {
				img: new Image(),
				overlayImg: new Image(),
				color: {r: 210, g: 130, b: 210}
			}
		},
		BOG: {
			display: "Bog",
			id: -1,
			enemies: [ENEMY_TYPE.GATOR, ENEMY_TYPE.BAT],
			environmentImgs: [],
			WAYSTONE: {
				img: new Image(),
				overlayImg: new Image(),
				color: {r: 0, g: globalEarth().g + globalWater().g, b: globalEarth().b + globalWater().b}
			}
		},
		CAVE: {
			display: "Cave",
			id: -1,
			enemies: [ENEMY_TYPE.RAT, ENEMY_TYPE.BAT],
			environmentImgs: [],
			WAYSTONE: {
				img: new Image(),
				overlayImg: new Image(),
				color: {r: 150, g: 150, b: 150}
			}
		},
		MOUNTAIN: {
			display: "Desert",
			id: -1,
			enemies: [ENEMY_TYPE.GATOR, ENEMY_TYPE.RAT],
			environmentImgs: [],
			WAYSTONE: {
				img: new Image(),
				overlayImg: new Image(),
				color: globalFire()
			}
		}
	};
	var biome0 = {};
	var biome1 = {};
	var biome2 = BIOME.CLEARING;
	var biome3 = {};
	var biome4 = {};
	// returns a biome ID give a lerp across the level
	function biomeAt(position) {
		return world[clamp(Math.round((position.x/levelWidth()) * LEVEL_WIDTH), 0, LEVEL_WIDTH - 1)];
	}
	// returns a biome object given an ID
	function biomeFromID(id) {
		switch (id) {
			case 0: return biome0; break;
			case 1: return biome1; break;
			case 3: return biome3; break;
			case 4: return biome4; break;
			default: return biome2; break;
		}
	}
	//== Generic objects (scenery, harvestables, etc)
	var objects = [];
	var OBJECT = {
		GLOWSHROOM: {
			randomBiomes: [BIOME.BOG, BIOME.CAVE],
			spawnChance: 0.025,
			spawnInGroups: 3,
			harvestable: -1,
			img: new Image(),
			xTiles: 6,
			yTiles: 1,
			light: {
				color: globalWater(),
				radius: 100,
				scaleOnHarvest: 0.12,
				alpha: 0.75
			}
		}
	};
	//}
	
	//== PHYSICS VARIABLES ==//
	var GRAVITY = 40;			// global gravity; this*dt added to velocity.y
	function inControl() { return currentGameState === GAME_STATE.IDLE; }
	
	//== GLOBAL HELPERS! ==//
	//== Array Safe Splice
	// Doesn't splice the last index if -1 is passed as index
	// Has better compatibility with indexOf, which returns -1 if the objec isn't found
	Array.prototype.safeSplice = function (index, amount) {
		if (index >= 0)
			this.splice(index, amount);
	}
	//== Color Literal to string
	// Many objects use object literals for rgb values
	// This converts them easily to an rgb() string
	function colorString(objLiteral, alpha) {
		return "rgba(" + objLiteral.r + ", " + objLiteral.g + ", " + objLiteral.b + ", " + alpha + ")";
	}
	
	
	
	// Set up canvas and game variables
	function init() {		
		// set level variables
		TERRAIN_HEIGHT = canvas.height - 150;
		
		// get reference to audio element
		bgAudio = document.querySelector('#bgAudio');
		
		// start music loop
		bgAudio.volume = 0.2;
		bgAudio.play();
		
		// taps working as jumps 
		canvas.addEventListener("mousedown", function(e) {
			mouse = getMouse(e); worldMouse = mouse; worldMouse.position.x += screenX;
			mouseDown = true;
			e.preventDefault();
			
			// run game actions if the UI was not clicked
			if(!uiClicked){				
				// if the player is dead, restart the game
				if (currentGameState === GAME_STATE.DEAD) {
					setupGame();
				}
				
				// if the player is alive and not casting, attempt a spell cast or uncast
				if (currentGameState === GAME_STATE.IDLE) {
					switch (e.which) {
						case 1:
							player.cast("cast");
							break;
						case 3:
							player.cast("uncast");
							break;
					}
				}
			}
		}.bind(this));
		// compatibility for touch devices
		canvas.addEventListener("touchstart", function(e) {
			mouseDown = true;
			e.preventDefault();
			
			// run game actions if the UI was not clicked
			if(!uiClicked){
				// if the player is dead, restart the game
				if (currentGameState == GAME_STATE.DEAD) {
					setupGame();
				}
			}
		}.bind(this));
		// track mouse position
		canvas.addEventListener("mousemove", function(e) { mouse = getMouse(e); worldMouse = mouse; worldMouse.position.x += screenX; });
		// taps working as jumps
		canvas.addEventListener("mouseup", function(e) { mouseDown = false; });
		canvas.addEventListener("touchend", function(e) { mouseDown = false; });
		
		// callback for button presses
		window.addEventListener("keydown", function(e) { keyPress(e, false); });
		// callback for button presses
		window.addEventListener("keyup", function(e) { keyRelease(e, false); });
		
		//== Register Title Screen UI ==//{
		windowManager.makeUI("titleScreen", 0, 0, canvas.width, canvas.height);
		var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grad.addColorStop(0, "rgb(0, 0, 50)");
		grad.addColorStop(1, "rgb(10, 10, 10)");
		windowManager.modifyUI("titleScreen", "fill", {color: grad});
		// start game button
		windowManager.makeButton("titleScreen", "startButton", 60, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {game.engine.setupGame();});
		windowManager.modifyButton("titleScreen", "startButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("titleScreen", "startButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("titleScreen", "startButton", "text", {string: "Start", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"});
		// instructions button
		windowManager.makeButton("titleScreen", "instructionButton", 250, 5*canvas.height/6, canvas.width/5, canvas.height/12, function() {windowManager.toggleUI("titleScreen"); windowManager.toggleUI("instructionScreen");});
		windowManager.modifyButton("titleScreen", "instructionButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("titleScreen", "instructionButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("titleScreen", "instructionButton", "text", {string: "Instructions", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"});
		// game title
		windowManager.makeText("titleScreen", "title", 50, 50, "default", "default", "Lumina", "40pt 'Bad Script'", "rgb(250, 255, 195)");
		windowManager.toggleUI("titleScreen");
		//}
		
		//== Register Instructions Screen ==//{
		windowManager.makeUI("instructionScreen", 0, 0, canvas.width, canvas.height);
		var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grad.addColorStop(0, "rgb(0, 0, 50)");
		grad.addColorStop(1, "rgb(10, 10, 10)");
		windowManager.modifyUI("instructionScreen", "fill", {color: grad});
		windowManager.activateUIPausing("instructionScreen");
		// instruction text
		windowManager.makeText("instructionScreen", "title", 50, 50, "default", "default", "Instructions", "40pt 'Bad Script'", "rgb(250, 255, 195)");
		windowManager.makeText("instructionScreen", "instructions", 65, 130, canvas.width - 50, "default", 
			"A/D:    Move left/right%n" +
			"1/2/3:   Cast spell element%n" +
			"Space/W:  Jump%n" +
			"Mouse:   Aim spell%n" +
			"LMB:    Launch spell%n" +
			"Bolt:    A ranged projectile cast toward the mouse%n" +
			"Rune:    A trap on the ground that triggers when an enemy steps on it%n" +
			"Grenade:  A lobbed projectile that bounces and explodes on enemy contact or at the end of its arc%n", 
			"20pt 'Bad Script'", "rgb(250, 255, 195)"
		);
		windowManager.modifyText("instructionScreen", "instructions", "padding", {top: 0, right: 0, bottom: 0, left: 0, line: 20});
		// back button
		windowManager.makeButton("instructionScreen", "backButton", canvas.width * 7/8 - 50, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {windowManager.toggleUI("instructionScreen"); windowManager.toggleUI("titleScreen");});
		windowManager.modifyButton("instructionScreen", "backButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("instructionScreen", "backButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("instructionScreen", "backButton", "text", {string: "Back", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"});
		//}
		
		//== Register In-Game Spell Type HUD ==//{
		windowManager.makeUI("controlsHUD", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD", "spellType1", 0, 0, 250, "default", "Press to choose type: ", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD", "spellType2", 0, 20, 150, "default", "1 - Bolt", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD", "spellType3", 0, 40, 150, "default", "2 - Rune", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD", "spellType4", 0, 60, 150, "default", "3 - Grenade", "14pt 'Bad Script'", "white");
		windowManager.makeUI("controlsHUD2", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD2", "spellElement1", 0, 0, 300, "default", "Press to choose element: ", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD2", "spellElement2", 0, 20, 150, "default", "1 - Fire", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD2", "spellElement3", 0, 40, 150, "default", "2 - Water", "14pt 'Bad Script'", "white");
		windowManager.makeText("controlsHUD2", "spellElement4", 0, 60, 150, "default", "3 - Earth", "14pt 'Bad Script'", "white");
		windowManager.makeUI("controlsHUD3", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD3", "cast1", 0, 0, 250, "default", "Click to cast", "14pt 'Bad Script'", "white");
		//}
		
		//== Register Spell Cast HUD ==//{
		windowManager.makeUI("spellHUD", canvas.width* 5/6, 0, canvas.width / 6, canvas.height / 6);
		windowManager.modifyUI("spellHUD", "fill", {color: "#3C3C3C"});
		windowManager.modifyUI("spellHUD", "border", {color: "#222", width: 4});
		windowManager.makeImage("spellHUD", "typeRune", 30, 15, 64, 64, emptyRune);
		windowManager.makeImage("spellHUD", "elementRune", 120, 15, 64, 64, emptyRune);
		windowManager.makeText("spellHUD", "spellCast", 30, 80, canvas.width / 6 - 20, canvas.height / 12 - 10, "", "12pt 'Bad Script'", "white");
		//}
		
		//== Register Enemy Info HUD ==//{
		windowManager.makeUI("enemyHUD", canvas.width/3, 0, canvas.width/3, 80);
		windowManager.modifyUI("enemyHUD", "fill", {color: "#3C3C3C"});
		windowManager.modifyUI("enemyHUD", "border", {color: "#222", width: 4});
		windowManager.makeImage("enemyHUD", "enemyImage", 10, 10, 80, 60, new Image());
		windowManager.modifyImage("enemyHUD", "enemyImage", "fill", {color: "#000"});
		windowManager.modifyImage("enemyHUD", "enemyImage", "border", {color: "#222", width: 4});
		windowManager.makeText("enemyHUD", "enemyName", 130, 10, canvas.width / 3 - 130, 40, "", "12pt 'Bad Script'", "white");
		windowManager.makeBar("enemyHUD", "enemyHealth", 130, 40, canvas.width / 3 - 150, 30, 1, 1, 0);
		windowManager.modifyBar("enemyHUD", "enemyHealth", "fill", {foreColor: "#080", backColor: "#880000"});
		//}
		
		//== Register Pause Screen ==//{
		windowManager.makeUI("pauseScreen", 0, 0, canvas.width, canvas.height);
		var grad2 = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grad2.addColorStop(0, "rgb(0, 0, 50)");
		grad2.addColorStop(1, "rgb(10, 10, 10)");
		windowManager.modifyUI("pauseScreen", "fill", {color: grad2});
		windowManager.activateUIPausing("pauseScreen");
		windowManager.makeText("pauseScreen", "pause", 50, 50, "default", "default", "Paused", "40pt 'Bad Script'", "rgb(250, 255, 195)");
		// continue button
		windowManager.makeButton("pauseScreen", "continueButton", 60, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {game.engine.resumeGame();});
		windowManager.modifyButton("pauseScreen", "continueButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("pauseScreen", "continueButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("pauseScreen", "continueButton", "text", {string: "Continue", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"});
		// quit button
		windowManager.makeButton("pauseScreen", "quitButton", 250, 5*canvas.height/6, canvas.width/10, canvas.height/12, function() {
			windowManager.deactivateUI("all");
			windowManager.activateUI("titleScreen");
			bgAudio.currentTime = 0;
			bgAudio.play();
			currentGameState = GAME_STATE.START;
		});
		windowManager.modifyButton("pauseScreen", "quitButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("pauseScreen", "quitButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("pauseScreen", "quitButton", "text", {string: "Quit", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"}); 
		//}
		
		//== Register Death Screen ==//{
		windowManager.makeUI("deathScreen", 0, 0, canvas.width, canvas.height);
		var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grad.addColorStop(0, "rgb(0, 0, 50)");
		grad.addColorStop(1, "rgb(10, 10, 10)");
		windowManager.modifyUI("deathScreen", "fill", {color: grad});
		windowManager.activateUIPausing("deathScreen");
		windowManager.makeText("deathScreen", "dead", 50, 50, canvas.width / 3, "default", "You died...", "40pt 'Bad Script'", "rgb(250, 255, 195)");
		// new game button
		windowManager.makeButton("deathScreen", "restartButton", 60, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {windowManager.deactivateUI("deathScreen"); game.engine.setupGame();});
		windowManager.modifyButton("deathScreen", "restartButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("deathScreen", "restartButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("deathScreen", "restartButton", "text", {string: "New game", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"});
		// quit button
		windowManager.makeButton("deathScreen", "quitButton", 250, 5*canvas.height/6, canvas.width/10, canvas.height/12, function() {
			windowManager.deactivateUI("all");
			windowManager.activateUI("titleScreen");
			currentGameState = GAME_STATE.START;
		});
		windowManager.modifyButton("deathScreen", "quitButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("deathScreen", "quitButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("deathScreen", "quitButton", "text", {string: "Quit", css: "24pt 'Bad Script'", color: "rgb(250, 255, 195)"}); 
		//}
		
		// BEGIN main loop
		loop();
	}
	
	// Setup a new game
	function setupGame() {
		// reset variables
		currentLevel = 0;
		currentGameState = GAME_STATE.IDLE;
		windowManager.deactivateUI("titleScreen");
		
		// prepare the level
		setupLevel();
		
		// create the player
		player = new Player();

		// attach a light source to the player
		lightSources.push(new LightSource(player, {r: 255, g: 255, b: 255}, 200, -1, true, false, 1));
	}
	
	// Setup the next level
	function setupLevel() {
		// increment level number and set up level variables
		++currentLevel;
		screenX = (LEVEL_WIDTH*TERRAIN_WIDTH)/2 - canvas.width/2; // center screen on level
		
		//== Reset entities ==//
		enemies = [];
		particles = [];
		particleSystems = [];
		projectiles = [];
		lightSources = [];
		waystones = [];
		
		//== Prepare the level ==//
		// Assign biome IDs //{
		// Map goes bog > forest > tower clearing < mountain < cave
		// can be flipped randomly per game, just for a little variance
		if (Math.round(Math.random()) === 0) {
			biome0 = BIOME.BOG;
			biome1 = BIOME.FOREST;
			biome3 = BIOME.MOUNTAIN;
			biome4 = BIOME.CAVE;
			BIOME.BOG.id = 0;
			BIOME.FOREST.id = 1;
			BIOME.MOUNTAIN.id = 3;
			BIOME.CAVE.id = 4;
		}
		else {
			biome0 = BIOME.CAVE;
			biome1 = BIOME.MOUNTAIN;
			biome3 = BIOME.FOREST;
			biome4 = BIOME.BOG;
			BIOME.CAVE.id = 0;
			BIOME.MOUNTAIN.id = 1;
			BIOME.FOREST.id = 3;
			BIOME.BOG.id = 4;
		}
		//}
		// Generate level grid //{
		for (var i = 0; i < LEVEL_WIDTH; ++i) {
			// get % across level
			var lerp = i/LEVEL_WIDTH;
			
			// Biome 0
			if (lerp < 0.2)
				world[i] = 0;
			// 0-1 transition
			if (lerp >= 0.2 && lerp < 0.25)
				world[i] = (lerp - 0.2)/0.05;
			// Biome 1
			if (lerp >= 0.25 && lerp < 0.425)
				world[i] = 1;
			// 1-2 transition
			if (lerp >= 0.425 && lerp < 0.475)
				world[i] = 1 + (lerp-0.425)/0.05;
			// Biome 2 (clearing)
			if (lerp >= 0.475 && lerp < 0.525)
				world[i] = 2;
			// 2-3 transition
			if (lerp >= 0.525 && lerp < 0.575)
				world[i] = 2 + (lerp-0.525)/0.05;
			// Biome 3
			if (lerp >= 0.575 && lerp < 0.75)
				world[i] = 3;
			// 1-2 transition
			if (lerp >= 0.75 && lerp < 0.8)
				world[i] = 3 + (lerp-0.75)/0.05;
			// Biome 4
			if (lerp >= 0.8)
				world[i] = 4;
				
			//== Attempt to create game objects at each tile
			// get the biome object
			var biome = biomeFromID(Math.round(world[i]));
			for (var key in OBJECT) {
				// rule out base object properties
				if (OBJECT.hasOwnProperty(key)) {
					// 1) check if the object can spawn in this biome
					// 2) do a random number check against its spawn chance
					if (OBJECT[key].randomBiomes.indexOf(biome) != -1 && Math.random() < OBJECT[key].spawnChance) {
						// create the new object
						objects.push(new WorldObject(OBJECT[key], Victor(i*TERRAIN_WIDTH, TERRAIN_HEIGHT)));
						
						// get how many objects should spawn - at least 1, maybe more if they spawn in groups
						var numObjects = 1;
						if (OBJECT[key].spawnInGroups >= 1.5) {
							numObjects = Math.round(rand(1, OBJECT[key].spawnInGroups));
						}
						
						// loop and create objects
						var groupStart = (i*TERRAIN_WIDTH) - (numObjects*(OBJECT[key].img.width/OBJECT[key].xTiles))/2;
						for (var x = 0; x < numObjects; ++x) {
							objects.push(new WorldObject(OBJECT[key], Victor(groupStart + x*(OBJECT[key].img.width/OBJECT[key].xTiles), TERRAIN_HEIGHT)));
						}
						break;
					}
				}
			}
		}
		//}
		// Create waystones //{
		//== Biome0 waystones
		waystones.push(new Waystone(biome0.WAYSTONE, Victor(levelWidth()*0.01 - biome0.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome0.WAYSTONE.img.height/2)));
		waystones.push(new Waystone(biome0.WAYSTONE, Victor(levelWidth()*0.485 - biome0.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome0.WAYSTONE.img.height/2)));
		//== Biome1 waystones
		waystones.push(new Waystone(biome1.WAYSTONE, Victor(levelWidth()*0.26 - biome1.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome1.WAYSTONE.img.height/2)));
		waystones.push(new Waystone(biome1.WAYSTONE, Victor(levelWidth()*0.49 - biome1.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome1.WAYSTONE.img.height/2)));
		// Skip biome2 - it's always the clearing!
		//== Biome3 waystones
		waystones.push(new Waystone(biome3.WAYSTONE, Victor(levelWidth()*0.74 - biome3.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome3.WAYSTONE.img.height/2)));
		waystones.push(new Waystone(biome3.WAYSTONE, Victor(levelWidth()*0.51 - biome3.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome3.WAYSTONE.img.height/2)));
		//== Biome4 waystones
		waystones.push(new Waystone(biome4.WAYSTONE, Victor(levelWidth()*0.99 - biome4.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome4.WAYSTONE.img.height/2)));
		waystones.push(new Waystone(biome4.WAYSTONE, Victor(levelWidth()*0.515 - biome4.WAYSTONE.img.width/2, TERRAIN_HEIGHT - biome4.WAYSTONE.img.height/2)));
		//== Make all waystones find their pair
		for (var i = 0; i < waystones.length; ++i) waystones[i].getOther();
		//}
		// Create tower //
		wizardTower = new WizardTower();
		
		//== Begin enemy spawn loop ==//
		enemyLoop = setInterval(function() {
			// get the current biome at the player
			var biomeCurrent = biomeFromID(Math.round(biomeAt(player.position)));
			
			// get the number of enemies on screen
			var numOnScreen = 0;
			for (var i = 0; i < enemies.length; ++i)
				if (onScreen(enemies[i])) ++numOnScreen;
			
			// attempt to spawn an enemy
			if (numOnScreen < 15 && biomeCurrent.enemies.length > 0 && inControl()) {
				enemies.push(new Enemy(biomeCurrent.enemies.randomElement()));
			}
		}, 1700);
		
		//== Prepare UI ==//
		activateHUD();
		
		// Begin running!
		currentGameState = GAME_STATE.IDLE;
	}
	
	// Load a level file into the map array
	function loadLevel() {
		// request object to connect to file
		var xhr = new XMLHttpRequest();
		
		// tell xhr to store map data once it's loaded
		xhr.onload = function() {
			var response = xhr.responseText;
			level = response.split(',');
		}
		
		var url = "maps/level" + currentLevel + ".csv";
		xhr.open('GET', url, true);
		// try to prevent browser caching by sending a header to the server
		xhr.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2010 00:00:00 GMT");
		xhr.send();
	}
	
	// Preloads an image into a new canvas and returns the canvas
	function preloadImage(src) {
		// Create the image and the canvas to draw it to, then load it in
		var newImg = new Image(); newImg.src = src;
		var newCanvas = document.createElement('canvas');
		++numImages;
		
		// Configure canvas once it's loaded
		newImg.onload = function() {
			newCanvas.width = newImg.width;
			newCanvas.height = newImg.height;
			newCanvas.getContext('2d').drawImage(newImg, 0, 0);
			++numImagesLoaded;
		}
		
		return newCanvas;
	}
	
	// Preloads an image with no canvas and returns the image
	function preloadImageNoCanvas(src) {
		// Create the image, then load it in
		var newImg = new Image(); newImg.src = src;
		++numImages;
		
		// Configure canvas once it's loaded
		newImg.onload = function() {
			++numImagesLoaded;
		}
		
		return newImg;
	}
	
	// Load game assets (images and sounds)
	function loadAssets() {
		//== Prepare canvases //{
		// canvas
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext("2d");
		// offscreen canvas
		offCanvas = document.createElement("canvas");
		offCanvas.width = canvas.width; offCanvas.height = canvas.height;
		offCtx = offCanvas.getContext("2d");
		// foreground canvas
		foreCanvas = document.createElement("canvas");
		foreCanvas.width = canvas.width; foreCanvas.height = canvas.height;
		foreCtx = foreCanvas.getContext("2d");
		// draw loading screen
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		fillText(ctx, "Loading assets...", canvas.width/2, canvas.height/2, "30pt 'Calibri'", "white");
		//}
			
		//== Player
		playerRun = preloadImage("assets/playerRun.png");
		playerToIdle = preloadImage("assets/playerToIdle.png");
			
		//== Biome Assets //{
		// Clearing
		BIOME.CLEARING.environmentImgs[1] = preloadImage("assets/SceneryClearing1.png");
		BIOME.CLEARING.environmentImgs[2] = preloadImage("assets/SceneryClearing2.png");
		BIOME.CLEARING.environmentImgs[4] = preloadImage("assets/SceneryClearing4.png");
		BIOME.CLEARING.environmentImgs[5] = preloadImage("assets/SceneryClearing5.png");
		// Forest
		BIOME.FOREST.environmentImgs[0] = preloadImage("assets/SceneryForest0.png");
		BIOME.FOREST.environmentImgs[1] = preloadImage("assets/SceneryForest1.png");
		BIOME.FOREST.environmentImgs[2] = preloadImage("assets/SceneryForest2.png");
		BIOME.FOREST.environmentImgs[3] = preloadImage("assets/SceneryForest3.png");
		BIOME.FOREST.environmentImgs[4] = preloadImage("assets/SceneryForest4.png");
		BIOME.FOREST.environmentImgs[5] = preloadImage("assets/SceneryForest5.png");
		// Bog
		BIOME.BOG.environmentImgs[0] = preloadImage("assets/SceneryBog0.png");
		BIOME.BOG.environmentImgs[1] = preloadImage("assets/SceneryBog1.png");
		BIOME.BOG.environmentImgs[2] = preloadImage("assets/SceneryBog2.png");
		BIOME.BOG.environmentImgs[3] = preloadImage("assets/SceneryBog3.png");
		BIOME.BOG.environmentImgs[4] = preloadImage("assets/SceneryBog4.png");
		BIOME.BOG.environmentImgs[5] = preloadImage("assets/SceneryBog5.png");
		// Cave
		BIOME.CAVE.environmentImgs[0] = preloadImage("assets/SceneryCave0.png");
		BIOME.CAVE.environmentImgs[1] = preloadImage("assets/SceneryCave1.png");
		BIOME.CAVE.environmentImgs[2] = preloadImage("assets/SceneryCave2.png");
		BIOME.CAVE.environmentImgs[3] = preloadImage("assets/SceneryCave3.png");
		BIOME.CAVE.environmentImgs[4] = preloadImage("assets/SceneryCave4.png");
		BIOME.CAVE.environmentImgs[5] = preloadImage("assets/SceneryCave5.png");
		// Mountain
		BIOME.MOUNTAIN.environmentImgs[0] = preloadImage("assets/SceneryMountain0.png");
		BIOME.MOUNTAIN.environmentImgs[1] = preloadImage("assets/SceneryMountain1.png");
		BIOME.MOUNTAIN.environmentImgs[2] = preloadImage("assets/SceneryMountain2.png");
		BIOME.MOUNTAIN.environmentImgs[3] = preloadImage("assets/SceneryMountain3.png");
		BIOME.MOUNTAIN.environmentImgs[4] = preloadImage("assets/SceneryMountain4.png");
		BIOME.MOUNTAIN.environmentImgs[5] = preloadImage("assets/SceneryMountain5.png");
		//}
		
		//== Tower
		towerImg = preloadImage("assets/towerExterior.png");
		towerInterior = preloadImage("assets/towerInterior.png");
		
		//== Game Objects
		OBJECT.GLOWSHROOM.img = preloadImage("assets/GlowbitMushrooms.png");
		
		//== HUD assets //{
		boltRune 	   = preloadImageNoCanvas("assets/boltRune.png");
		runeRune 	   = preloadImageNoCanvas("assets/runeRune.png");
		grenadeRune    = preloadImageNoCanvas("assets/grenadeRune.png");
		fireRune 	   = preloadImageNoCanvas("assets/fireRune.png");
		waterRune 	   = preloadImageNoCanvas("assets/waterRune.png");
		earthRune 	   = preloadImageNoCanvas("assets/earthRune.png");
		emptyRune 	   = preloadImageNoCanvas("assets/emptyRune.png");
		//}
		
		//== Enemies //{
		ENEMY_TYPE.RAT.img 		= preloadImage("assets/ratRun.png");
		ENEMY_TYPE.RAT.profile 	= preloadImageNoCanvas("assets/ratProfile.png");
		ENEMY_TYPE.BAT.img 		= preloadImage("assets/batRun.png");
		ENEMY_TYPE.BAT.profile 	= preloadImageNoCanvas("assets/batProfile.png");
		ENEMY_TYPE.GATOR.img 	= preloadImage("assets/gatorRun.png");
		ENEMY_TYPE.GATOR.profile 	= preloadImageNoCanvas("assets/gatorProfile.png");
		//}
		
		//== Projectiles //{
		PROJECTILE_TYPE.FIREBOLT.img 		= preloadImage("assets/firebolt.png");
		PROJECTILE_TYPE.FIREGRENADE.img 	= preloadImage("assets/firegrenade.png");
		PROJECTILE_TYPE.WATERBOLT.img 		= preloadImage("assets/waterbolt.png");
		PROJECTILE_TYPE.WATERGRENADE.img	= preloadImage("assets/watergrenade.png");
		PROJECTILE_TYPE.EARTHBOLT.img 		= preloadImage("assets/earthbolt.png");
		PROJECTILE_TYPE.EARTHGRENADE.img 	= preloadImage("assets/earthgrenade.png");
		PROJECTILE_TYPE.POISONBOLT.img 		= preloadImage("assets/poisonBolt.png");
		//}
		
		//== Particles //{
		PARTICLE_TYPE.FLAME.img = PARTICLE_TYPE.FLAMEFOUNTAIN.img = PARTICLE_TYPE.BURN.img = PARTICLE_TYPE.FLAMEEXPLODE.img = preloadImage("assets/flameParticle.png");
		PARTICLE_TYPE.WATERDRIP.img = PARTICLE_TYPE.WATERFOUNTAIN.img = PARTICLE_TYPE.WATEREXPLODE.img = preloadImage("assets/dripParticle.png");
		PARTICLE_TYPE.EARTH.img = PARTICLE_TYPE.EARTHFOUNTAIN.img = PARTICLE_TYPE.EARTHEXPLODE.img = preloadImage("assets/earthParticle.png");
		//}
		
		//== Waystones //{
		BIOME.FOREST.WAYSTONE.img	= preloadImage("assets/waystoneForest.png");
		BIOME.BOG.WAYSTONE.img		= preloadImage("assets/waystoneBog.png");
		BIOME.MOUNTAIN.WAYSTONE.img	= preloadImage("assets/waystoneMountain.png");
		BIOME.CAVE.WAYSTONE.img		= preloadImage("assets/waystoneCave.png");
		// Waystone overlays
		BIOME.FOREST.WAYSTONE.overlayImg	= preloadImage("assets/waystoneForestOverlay.png");
		BIOME.BOG.WAYSTONE.overlayImg		= preloadImage("assets/waystoneBogOverlay.png");
		BIOME.MOUNTAIN.WAYSTONE.overlayImg	= preloadImage("assets/waystoneMountainOverlay.png");
		BIOME.CAVE.WAYSTONE.overlayImg		= preloadImage("assets/waystoneCaveOverlay.png");
		//}
		
		//== Runes //{
		RUNE_TYPE.FIRE.img = preloadImageNoCanvas("assets/runeFire.png");
		RUNE_TYPE.WATER.img = preloadImageNoCanvas("assets/runeWater.png");
		RUNE_TYPE.EARTH.img = preloadImageNoCanvas("assets/runeEarth.png");
		//}
		
		// Don't initialize until images are loaded
		function initOnLoad() {
			if (numImagesLoaded >= numImages)
				init();
			else
				setTimeout(initOnLoad, 1);
		};
		initOnLoad();
	}
	
	// play a sound effect
	function playStream(source, vol) {
		var audioPlayer = new Audio("assets/" + source);
		audioPlayer.volume = vol;
		audioPlayer.play();
	}
	
	// parallax an image across screen
	function parallax(context, plxImg, scalar, alpha) {
		if (plxImg != undefined) {
			context.save();
				context.globalAlpha = alpha;
				
				// scale so parallax fits height-wise on screen
				var imgScale = canvas.height/plxImg.height;
				
				for (var i = -((screenX*scalar) % (plxImg.width*imgScale)); i < canvas.width; i += (plxImg.width*imgScale)) {
					context.drawImage(plxImg, i, 0, plxImg.width*imgScale, canvas.height);
				}
			context.restore();
		}
	}
	
	// FUNCTION: checks if the object 'o' is on screen
	function onScreen(o) {
		// get world object position in screen coords
		var p = o.position.clone(); p.x -= screenX;
		return (p.x < canvas.width && p.x + o.bounds.x > 0 && p.y < canvas.height && p.y + o.bounds.y > 0);
	}
	
	// FUNCTION: checks if the object 'o' is within the level (with a little wiggle room)
	function inLevel(o) {
		return (o.position.x < levelWidth() + 200 && o.position.x + o.bounds.x > -200 && o.position.y < canvas.height + 200 && o.position.y + o.bounds.y > -200);
	}
	
	// main loop - always runs
	function loop() {
		animationID = requestAnimationFrame(loop);
		
		if (currentGameState === GAME_STATE.IDLE)
			update();
		
		game.windowManager.updateAndDraw([]);
	}
	
	// main game tick - not called if paused
	function update() {
		// reset/calculate control variables
		postProcesses = [];
		dt = calculateDeltaTime();
		++time;
		
		// start game if on start screen and space or start is being pressed
		if (currentGameState === GAME_STATE.START) {
			return;
		}
		
		// make screen track player
		if (player != undefined) {
			screenX = clamp(player.position.x + player.bounds.x/2 - canvas.width/2, 0, levelWidth() - canvas.width);
		}
			
		// get how far across level we are; used for drawing appropriate biome stuff
		var levelLerp = (screenX + canvas.width/2)/levelWidth();
		
		// == Main Draw ==//
		//== Clear the canvases
		offCtx.clearRect(0, 0, offCanvas.width, offCanvas.height);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height);
		
		//== Prepare Biomes
		var biomeNum = biomeAt(player.position);			  // get the decimal ID of the biome based on player's X
		var biomeCurrent = biomeFromID(Math.round(biomeNum)); // get the current biome
		var biomeCeil = biomeFromID(Math.ceil(biomeNum));
		var biomeFloor = biomeFromID(Math.floor(biomeNum));
		// we'll draw the parallaxes as differing alphas to fade between them
		var biomeAlpha = biomeNum % 1;
		
		//== Biome parallaxes
		// simulate the biome transition if we're moving between biomes
		for (var i = 4; i > 0; --i) {
			if (biomeCeil != biomeCurrent || biomeFloor != biomeCurrent) {
				// Draw parallax 4 at correct 
				// get the alpha
				var alpha = (biomeAlpha > (i-1)*0.25 ? (biomeAlpha - (i-1)*0.25)/0.25 : 0);
				if (biomeAlpha > i*0.25) alpha = 1;
				// draw each parallax at correct alpha
				if (alpha != 1)
					parallax(offCtx, biomeFloor.environmentImgs[i], 1.15 - (i*0.15), 1 - alpha);
				if (alpha != 0)
					parallax(offCtx, biomeCeil.environmentImgs[i], 1.15 - (i*0.15), alpha);
			}
			else {
				parallax(offCtx, biomeCurrent.environmentImgs[i], 1.15 - (i*0.15), 1);
			}
		}
		
		//== Update & Draw All Objects ==//
		// All entities actually draw on the offsreen canvas in their draw function
		// We will then manipulate lighting on the offscreen canvas and move it to the onscreen
				
		// draw wizard tower
		if (onScreen(wizardTower)) {
			wizardTower.update();
		}
				
		// draw onscreen game objects
		for (var i = 0; i < objects.length; ++i) {
			if (onScreen(objects[i]))
				objects[i].draw();
		}
		
		// update runes
		for (var i = 0; i < runes.length; ++i) {
			runes[i].update();
		}
		
		// update waystones
		for (var i = 0; i < waystones.length; ++i) {
			waystones[i].update();
		}
		
		// only actually update if player is in control or they're off the ground
		// we also update if they're off the ground so they don't freeze midair between levels
		if (inControl() || !player.onGround)
			player.update();
		// otherwise, just do the draw
		else
			player.draw();
		
		// if the player has died, send game to death screen
		if (player.health <= 0 && currentGameState != GAME_STATE.DEAD) {
			// activate death screen
			windowManager.activateUI("deathScreen");
			
			// Update game state
			currentGameState = GAME_STATE.DEAD;
			
			// Cancel enemy spawn loop
			clearInterval(enemyLoop);
		}
		
		// if hovered over any enemy this frame
		var frameHover = false;
		// update enemies
		for (var i = 0; i < enemies.length; ++i) {
			// enemy temp reference
			var e = enemies[i];
			// only actually update enemies if player is in control
			if (inControl())
				e.update();
			// otherwise, just do the draw
			else
				e.draw();
			// check if mouse is hovering on enemy
			if (worldMouse.position.x >= (e.position.x - 10) && worldMouse.position.x <= (e.position.x + e.bounds.x + 10) && worldMouse.position.y >= (e.position.y - 10) && worldMouse.position.y <= (e.position.y + e.bounds.y + 10)) {
				// activate and update HUD if hovered onto enemy
				enemyHover = true;
				frameHover = true;
				windowManager.modifyImage("enemyHUD", "enemyImage", "image", {image: e.enemyType.profile});
				windowManager.modifyText("enemyHUD", "enemyName", "text", {string: e.enemyType.name, css: "12pt 'Bad Script'", color: "white"});
				windowManager.modifyBar("enemyHUD", "enemyHealth", "text", {string: (Math.max(Math.round(e.health), 0) + "/" + e.maxHealth), css: "12pt 'Bad Script'", color: "white"});
				windowManager.modifyBar("enemyHUD", "enemyHealth", "target", {tgtVar: e.health, tgtMax: e.maxHealth, tgtMin: 0});
				windowManager.activateUI("enemyHUD");
			}
		}
		// deactivate if mouse hovers off enemy
		if (frameHover == false && enemyHover == true) {
			enemyHover = false;
			windowManager.deactivateUI("enemyHUD");
		}
		
		// update projectiles
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].update();
		}
												
		// update particle systems
		for (var i = 0; i < particleSystems.length; ++i)
			particleSystems[i].update();
		// update all particles
		for (var i = 0; i < particles.length; ++i)
			particles[i].update();
			
		// update light sources
		for (var i = 0; i < lightSources.length; ++i)
			lightSources[i].update();
			
		// Foreground
		// simulate the biome transition if we're moving between biomes
		foreCtx.globalCompositeOperation = "source-over";
		if (biomeCeil != biomeCurrent || biomeFloor != biomeCurrent) {
			parallax(foreCtx, biomeFloor.environmentImgs[0], 1.15, 1 - biomeAlpha);
			parallax(foreCtx, biomeCeil.environmentImgs[0], 1.15, biomeAlpha);
		}
		else {
			parallax(foreCtx, biomeCurrent.environmentImgs[0], 1.15, 1);
		}
		
		//== Manipulate canvas ==//
		// First, draw the untouched images onto the main canvas
		ctx.globalCompositeOperation = "source-over";
		ctx.drawImage(offCanvas, 0, 0);
		
		// Overlay everything with black
		ctx.fillStyle = "rgba(0, 0, 0, 0.969)";
		ctx.globalCompositeOperation = "source-atop";
		// if we're in the clearing, give a small ambient light
		if (biomeCeil === biomeCurrent && biomeFloor === biomeCurrent && biomeCurrent === BIOME.CLEARING) {
			ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
		}
		// if we're transitioning from the clearing, darken it further
		if (biomeCeil != biomeCurrent || biomeFloor != biomeCurrent) {
			if (biomeFloor === BIOME.CLEARING)
				ctx.fillStyle = "rgba(0, 0, 0, " + (0.85 + biomeAlpha*.15) + ")";
			if (biomeCeil === BIOME.CLEARING)
				ctx.fillStyle = "rgba(0, 0, 0, " + (0.85 + (1 - biomeAlpha)*.15) + ")";
		}
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Next, loop through the lights and cut out the lit parts
		ctx.save();
			for (var i = 0; i < lightSources.length; ++i) {
				// get the current light source
				var l = lightSources[i];
				
				// create a radial gradient
				var radial = ctx.createRadialGradient(-screenX + l.position.x + l.offset.x, l.position.y + l.offset.y, Math.max(l.radius, 0), -screenX + l.position.x + l.offset.x, l.position.y + l.offset.y, 0);
				radial.addColorStop(0, "rgba(0, 0, 0, 0)");
				radial.addColorStop(0.2, "rgba(0, 0, 0, 0.075)");
				radial.addColorStop(1, l.color);
				ctx.fillStyle = radial;

				// subtract the light from the main canvas
				ctx.beginPath();
				ctx.arc(-screenX + l.position.x + l.offset.x, l.position.y + l.offset.y, Math.max(l.radius, 0), 0, Math.PI*2, false);
				ctx.globalCompositeOperation = "destination-out";
				ctx.fill();
			}
		ctx.restore();
		
		// Apply lighting to the offscreen foreground canvas
		foreCtx.globalCompositeOperation = "source-atop";
		foreCtx.drawImage(canvas, 0, 0);
		
		// Finally, draw the lit parts onto the main canvas
		ctx.globalCompositeOperation = "destination-over";
		ctx.drawImage(offCanvas, 0, 0);
		
		
		//== Draw postprocessed objects ==//
		// Objects can schedule their draw call in the postprocess array
		// These objects won't be affected by the main shading process
		ctx.globalCompositeOperation = "source-over";
		for (var i = 0;	i < postProcesses.length; ++i)
			postProcesses[i]();
		
		//== Draw foreground ==//
		// We want this drawn last to avoid anomalies
		// e.g. particles drawing above foreground
		ctx.drawImage(foreCanvas, 0, 0);
		
		//== Draw static environment ==//
		// These are drawn last, unmodified
		// background
		ctx.globalCompositeOperation = "destination-over";
		// simulate the biome transition if we're moving between biomes
		if (biomeCeil != biomeCurrent || biomeFloor != biomeCurrent) {
			parallax(ctx, biomeFloor.environmentImgs[5], 1, 1 - biomeAlpha);
			parallax(ctx, biomeCeil.environmentImgs[5], 1, biomeAlpha);
		}
		else {
			parallax(ctx, biomeCurrent.environmentImgs[5], 1, 1);
		}
		// base background is black
		ctx.fillStyle = "black";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		ctx.restore();
	
		//== Draw HUDs/interfaces ==//
		ctx.globalCompositeOperation = "source-over";
		if (currentGameState != GAME_STATE.DEAD && currentGameState != GAME_STATE.PAUSED) {
			// Draw health and mana orb HUD elements
			ctx.save();
			var orbWidth = 125;
			
			// Red health gradient
			var gradHealth = ctx.createLinearGradient(0, 0, 0, orbWidth);
				gradHealth.addColorStop(0, "rgb(100, 100, 100)");
				gradHealth.addColorStop(1 - clamp(player.health/player.maxHealth, 0, 1), "rgb(100, 100, 100)");
				gradHealth.addColorStop(1 - clamp(player.health/player.maxHealth, 0, 1), "rgb(135, 0, 60)");
				gradHealth.addColorStop(1, "rgb(135, 0, 60)");
			// Blue mana gradient
			var gradMana = ctx.createLinearGradient(0, 0, 0, orbWidth);
				gradMana.addColorStop(0, "rgb(100, 100, 100)");
				gradMana.addColorStop(1 - clamp(player.mana/player.maxMana, 0, 1), "rgb(100, 100, 100)");
				gradMana.addColorStop(1 - clamp(player.mana/player.maxMana, 0, 1), "rgb(60, 55, 160)");
				gradMana.addColorStop(1, "rgb(60, 55, 160)");
			// Dark orb shadow gradient
			var radial = ctx.createRadialGradient(orbWidth/2, orbWidth/2, orbWidth/2, orbWidth/2, orbWidth/2, 0);
				radial.addColorStop(0, "rgba(0, 0, 0, 0.65)");
				radial.addColorStop(0.25, "rgba(0, 0, 0, 0.3)");
				radial.addColorStop(0.5, "rgba(0, 0, 0, 0)");
				radial.addColorStop(1, "rgba(0, 0, 0, 0)");
			// White orb highlight gradient
			var radialWhite = ctx.createRadialGradient(orbWidth*.23, orbWidth*.27, orbWidth*.066, orbWidth*.23, orbWidth*.27, 0);
				radialWhite.addColorStop(0, "rgba(255, 255, 255, 0)");
				radialWhite.addColorStop(0.5, "rgba(255, 255, 255, 0.15)");
				radialWhite.addColorStop(1, "rgba(255, 255, 255, 0.65)");
			// Health Orb
			ctx.translate(0, canvas.height-orbWidth);
				ctx.fillStyle = gradHealth;
				ctx.beginPath();
				ctx.arc(orbWidth/2, orbWidth/2, orbWidth/2, 0, Math.PI*2, false);
				ctx.fill();
				ctx.fillStyle = radial;
				ctx.beginPath();
				ctx.arc(orbWidth/2, orbWidth/2, orbWidth/2, 0, Math.PI*2, false);
				ctx.fill();
				ctx.fillStyle = radialWhite;
				ctx.beginPath();
				ctx.arc(orbWidth*.23, orbWidth*.27, orbWidth*.066, 0, Math.PI*2, false);
				ctx.fill();
				ctx.closePath();
			// Mana Orb
			ctx.translate(canvas.width - orbWidth, 0);
				ctx.fillStyle = gradMana;
				ctx.beginPath();
				ctx.arc(orbWidth/2, orbWidth/2, orbWidth/2, 0, Math.PI*2, false);
				ctx.fill();
				ctx.fillStyle = radial;
				ctx.beginPath();
				ctx.arc(orbWidth/2, orbWidth/2, orbWidth/2, 0, Math.PI*2, false);
				ctx.fill();
				ctx.fillStyle = radialWhite;
				ctx.beginPath();
				ctx.arc(orbWidth*.23, orbWidth*.27, orbWidth*.066, 0, Math.PI*2, false);
				ctx.fill();
				ctx.closePath();
				
			ctx.restore();
		}
	}
	
	// BASE CLASS: game object with physics and bounding box variables
	function GameObject() {
		// starting position of game object
		this.position = new Victor();
		// bounding box width and height for game object
		this.bounds = new Victor();
		// offset to draw the object's image at, changes it's "point of rotation" in a sense
		this.offset = new Victor();
		// whether or not this object collides with other objects at all
		this.collidable = true;
		// whether or not this object is solid - collideable objects hit it
		this.solid = false;
		
		// MUTATOR: force object's position, within bounds of canvas
		this.setPosition = function(x, y) {
			this.position.x = clamp(x, 0, canvas.width);
			this.position.y = clamp(y, 0, canvas.height);
		}

		// HELPER: returns a vector from the center of this game object
		// to the center of the given game object
		this.vecToOther = function(other) {
			// if either object has no bounds, use 0 size bounding box
			var mBounds = (this.bounds != undefined ? this.bounds : Victor());
			var oBounds = (other.bounds != undefined ? other.bounds : Victor());
			return other.position.clone().add(oBounds.clone().divide(Victor(2, 2))).subtract(this.position.clone().add(mBounds.clone().divide(Victor(2, 2))));
		}
		
		// HELPER: returns whether this object overlaps the one passed in
		this.overlaps = function(other) {
			return (other.position.y + other.bounds.y > this.position.y && other.position.y < this.position.y + this.bounds.y
				 && other.position.x + other.bounds.x > this.position.x && other.position.x < this.position.x + this.bounds.x);
		}
	}
	
	// BASE CLASS: game object that can move
	function MobileObject() {
		GameObject.call(this);
	
		// starting velocity of game object
		this.velocity = new Victor();
		this.onGround = true;	// whether the object is currently grounded
		this.maxHealth = 0; 	// this object's max health
		this.health = 0; 		// this object's current health
		this.fireTicks = 0;		// amount of ticks left while this is on fire
		this.xScale = 1;		// used with velocity to draw facing the right direction
		
		// HELPER: damage the object
		this.damage = function(strength) {
			this.health -= strength;
		}
		
		// FUNCTION: update mobile object's phsyics
		this.updatePhysics = function() {
			// update scale to face direction it's looking
			if (Math.abs(this.velocity.x) > 0)
				this.xScale = Math.sign(this.velocity.x);
			
			// update whether or not this is on the ground
			this.onGround = (this.position.y + this.bounds.y === TERRAIN_HEIGHT);
			
			// update physics based on grounding
			if (!this.onGround || this instanceof Projectile) {
				// stop for gravityless projectiles
				var doGravity = true;
				var scalar = 1;
				
				// do special projectile physics
				if (this instanceof Projectile) {
					if (!this.projType.gravity)
						doGravity = false;
					if (this.type() === "grenade")
						scalar = 0.65;
				}
				// don't do gravity for flying enemies
				if (this instanceof Enemy)
					if (this.enemyType.AI === "flying")
						doGravity = false;
				
				if (doGravity) {
					this.velocity.y += GRAVITY * dt * scalar;
				}
			}
			else {
				// ground friction
				this.velocity.x *= .91;
				this.velocity.y = 0;
				
				// lock x velocity to 0
				if (Math.abs(this.velocity.x) < .01)
					this.velocity.x = 0;
			}
				
			// increment position
			this.position.add(this.velocity);
			
			// always be above ground
			if (this.position.y + this.bounds.y > TERRAIN_HEIGHT && !(this instanceof Projectile))
				this.position.y = TERRAIN_HEIGHT - this.bounds.y;
		}
		
		// FUNCTION: force a jump
		this.jump = function(speed, startingPush) {
			if (this.onGround)
				// give the initial thrust
				this.velocity.y = -speed;
				this.position.y -= startingPush;
				this.onGround = false;
				// force animation to run a bit
				++this.time;
		}.bind(this);
	}
	
	// CLASS: a basic object in the world, either cosmetic, interactable, harvestable, etc.
	function WorldObject(objectType, position) {
		// Inherit from base GameObject
		GameObject.call(this);
		
		// Basic properties
		this.system = {};			// object's particle system
		this.light = {};			// object's light source
		this.harvested = false;		// whether or not this has been harvest
		this.harvestTicks = -1;		// ticks until this regrows
		
		// Create initial bounds based on its image then use it to modify position
		this.bounds = new Victor(objectType.img.width/objectType.xTiles, objectType.img.height/objectType.yTiles);
		this.position = position;
		this.position.y -= this.bounds.y*0.85 + 50;
		
		// The random artwork of this object
		this.tile = Math.round(rand(0, objectType.xTiles - 0.51));
		
		// Create the object's light source if it should have one
		if (objectType.light != {}) {
			// set radius to default width based on setting (default = bounds.x)
			var radius = (objectType.light.radius === "default" ? this.bounds.x : objectType.light.radius);
			this.light = new LightSource(this, objectType.light.color, radius, -1, true, true, objectType.light.alpha);
			lightSources.push(this.light);
		}
		
		// Draw the object
		this.draw = function() {
			// draw the object
			offCtx.drawImage(objectType.img, this.tile*this.bounds.x, 0, this.bounds.x, this.bounds.y, -screenX + this.position.x, this.position.y, this.bounds.x, this.bounds.y);
			
			// set its light source's radius based on if it's harvest
			var rad = (objectType.light.radius === "default" ? this.bounds.x : objectType.light.radius);
			this.light.radius = (this.harvested ? rad * scaleOnHarvest : rad);
		}
	}
	
	// CLASS: one of the waystones used as a checkpoint to warp between worlds
	function Waystone(waystoneType, position) {
		// Inherit from base object
		GameObject.call(this);
		
		// Get info from the waystone's type
		this.waystoneType = waystoneType;
		this.position = position;	// waystone's world position
		this.img = waystoneType.img;// waystone's image
		this.source = {}; 			// waystone's light source
		this.bounds = new Victor();	// bounding box
		this.active = false;		// whether or not this waystone is active (can be used for teleporting)
		this.bounds = new Victor(this.img.width, this.img.height);
		this.source = new LightSource(this, waystoneType.color, 0, -1, false, true, 1);
		this.pair	= {};			// this waystone's matching waystone
		this.opacityScalar = 0;		// used for waystone activation glow, etc.
		lightSources.push(this.source);
		this.central = Math.abs((this.position.x/levelWidth()) - 0.5) < 0.1; // variable storing whether this is one of the central level keystones
		
		// FUNCTION: gets this waystone's matching waystone
		this.getOther = function() {
			// Loop waystones
			for (var i = 0; i < waystones.length; ++i) {
				// check if it's a matching waystoneType that isn't this one
				if (waystones[i] != this && waystones[i].waystoneType === this.waystoneType) {
					this.pair = waystones[i];
					break;
				}
			}
		}
		
		// FUNCTION: progresses game when waystones are activated
		this.increaseProgression = function() {
			// Increment global progression variable
			++progression;
			
			// Update world game objects based on progression
			switch (progression) {
				case 1:
					break;
				case 2:
					break;
				case 3:
					break;
				case 4:
					break;
			}
		}
		
		// Main update function
		this.update = function() {
			// Waystone only ever does anything if the player is touching it - check that first
			if (this.overlaps(player)) {
				// Activate the waystone (and its pair) if it's touching the player for the first time
				if (!this.active) {
					// Only activate on touch if it's an outer waystone
					// We check this separately so the else below triggers
					if (!this.central) {
						// Increment progression progresses the game as waystones are activated
						this.increaseProgression();
						this.active = true;
						this.pair.active = true;
						playStream("runeActivate.mp3", 0.5);
						// force the pair's opacity scalar up so it'll glow once we teleport to it
						this.pair.opacityScalar = 0.35;
					}
				}
				// Animate light to full lit once it activates
				else if (this.opacityScalar < 1) {
					// make sure it's fully lit
					this.opacityScalar = clamp(this.opacityScalar*1.025, 0, 1);
					this.source.radius = Math.pow(this.bounds.x, 1.1) * this.opacityScalar;
					this.source.alpha = this.opacityScalar;
				}
				else {
					// Schedule a post-process draw of "Space to warp" if the player is overlapping
					postProcesses.push(this.postDraw.bind(this));
				}
			
				// Check if the player is jumping, and if this and its pair are active
				// If they are, we'll teleport the player to the pairing waystone
				if (this.active && this.pair.active && (keys[KEY.SPACE] || keys[KEY.W])) {
					// Launch the player
					player.velocity = Victor(0, -100);
					playStream("teleport.mp3", 0.5);
					
					// Wait a second, then teleport the player to the matching waystone
					setTimeout(function() {
						player.velocity = Victor(0, 100);
						player.position = Victor(this.pair.position.x + this.pair.bounds.x/2 - player.bounds.x/2, -500);
					}.bind(this), 1000);
				}
			}
			
			// Change waystone's light's alpha based on player distance if it's not yet active
			if (!this.active && !this.central) {
				this.opacityScalar = 1 - clamp(Math.abs(this.position.x + this.bounds.x/2 - player.position.x)/(canvas.width/2), 0, 0.65);
				this.source.radius = Math.pow(this.bounds.x, 1.1) * this.opacityScalar;
				this.source.alpha = this.opacityScalar;
			}
			
			// Draw the waystone
			this.draw();
		}
		
		// Main draw function
		this.draw = function() {
			offCtx.save();
				offCtx.drawImage(this.img, -screenX + this.position.x, this.position.y);
				offCtx.globalAlpha = this.opacityScalar;
				offCtx.drawImage(this.waystoneType.overlayImg, -screenX + this.position.x - 5, this.position.y - 10);
			offCtx.restore();
		}
		
		// Postprocess draw
		this.postDraw = function() {
			fillText(ctx, "Jump to warp", -screenX + player.position.x + player.bounds.x/2, player.position.y - 30, "16pt 'Bad Script'", "white");
		}
	}
	
	// CLASS: the wizard's tower in the center of the map
	function WizardTower() {
		// Inherits from GameObject
		GameObject.call(this);
		
		// Initial variables
		this.position = new Victor(levelWidth()/2 - towerImg.width/2, TERRAIN_HEIGHT - towerImg.height - 25);
		this.bounds = new Victor(towerImg.width, towerImg.height);
		this.sources = []; // all lights attached to the wizard tower
		
		// Create the tower's light sources //{
		// Earth orb
		this.sources.push(new LightSource(this, globalEarth(), 75, -1, false, true, 1));
		this.sources[0].setOffset(new Victor(-380, 30));
		lightSources.push(this.sources[0]);
		
		// Fire orb
		this.sources.push(new LightSource(this, {r: 255, g:0, b:0}, 75, -1, false, true, 1));
		this.sources[1].setOffset(new Victor(-18, 26));
		lightSources.push(this.sources[1]);
		
		// Water orb
		this.sources.push(new LightSource(this, globalWater(), 75, -1, false, true, 1));
		this.sources[2].setOffset(new Victor(372, 35));
		lightSources.push(this.sources[2]);
		
		// Door
		this.sources.push(new LightSource(this, globalLight(), 255, -1, true, true, 0.75));
		this.sources[3].setOffset(new Victor(-16, 300));
		lightSources.push(this.sources[3]);
		
		// Bottom left window
		this.sources.push(new LightSource(this, globalLight(), 125, -1, true, true, 0.6));
		this.sources[4].setOffset(new Victor(-148, -10));
		lightSources.push(this.sources[4]);
		
		// Bottom right window
		this.sources.push(new LightSource(this, globalLight(), 125, -1, true, true, 0.6));
		this.sources[5].setOffset(new Victor(106, -18));
		lightSources.push(this.sources[5]);
		
		// Top middle window
		this.sources.push(new LightSource(this, globalLight(), 125, -1, true, true, 0.6));
		this.sources[6].setOffset(new Victor(-7, -204));
		lightSources.push(this.sources[6]);
		//}
		
		// Main tower update
		this.update = function() {
			this.draw();
		}
		
		// Main tower draw
		this.draw = function() {
			offCtx.drawImage(towerImg, -screenX + this.position.x, this.position.y);
		}
	}
	
	// CLASS: player object
	function Player() {
		MobileObject.call(this);
	
		/* VARIABLES */
		// General variables
		this.maxHealth = this.health = 100; 	// the player's health and max health
		this.maxMana = this.mana = 100;			// the player's mana and max mana
		this.expCurrent = 0;					// experience towards next level
		this.expMax = 0;						// experience needed to level up
		this.level = 0;							// current level
		this.skillPoints = 0;					// available skill points
		// Drawing
		this.time = 0;							// used to control animation timing
		this.currentImg = playerRun;			// the current image the player is drawing
		this.frameWidth = this.currentImg.width/28; // width of 1 frame from the spritesheet
		this.frameHeight = this.currentImg.height; // height of 1 frame from the spritesheet
		this.offset = new Victor(); 			// player's image offset
		// Physics & Movement
		this.position = new Victor(				// starting player position, centered on level
			levelWidth()/2,
			TERRAIN_HEIGHT - this.bounds.y
		);
		this.bounds = new Victor(				// the player's bounding box width and height, position is top left
			this.frameWidth,
			this.frameHeight
		);
		this.velocity = new Victor(0, 0);		// player's velocity
		this.onGround = true;					// used for updating physics
		// Spellcasting
		this.spellType = "";					// the spell type of the player's current spell
		this.spellElement = "";					// the element of the player's current spell
		this.spellName = "";					// string naming the current spell
		this.cooldown = 0;						// cooldown, determines whether a spell can be cast
		this.damageTicks = 0;					// cooldown on damage
		
		// FUNCTION: gives the player experience, attempting level ups
		this.gainExperience = function(xp) {
			this.expCurrent += xp;
			
			// Attempt a level up
			if (this.expCurrent > this.expMax) {
				this.expCurrent -= this.expMax;
				++this.level;
				++this.skillPoints;
			}
		}
		
		// FUNCTION: damage the player, does appropriate armor checks, etc
		this.damage = function(power) {
			this.health -= power;
			this.damageTicks = Math.min(40, power*5);
		}
		
		// FUNCTION: makes progress towards casting a spell
		this.cast = function(keycode) {
			// break out if the player is on cooldown
			if (this.cooldown > 0) return;
			// break out if it's not a spell key
			if (keycode != KEY.ONE && keycode != KEY.Z && keycode != KEY.TWO && keycode != KEY.X && keycode != KEY.THREE && keycode != KEY.C && keycode != "cast" && keycode != "uncast") return;
			
			//== Set spell property based on how far into spell cast they are
			// if spell type isn't set or they're attempting a new cast, set based on which key was pressed
			if ((this.spellType === "" || (this.spellType != "" && this.spellElement != "")) && keycode != "cast" && keycode != "uncast") {
				// if they're trying to cast a new spell
				if (this.spellType != "" && this.spellElement != "") {
					// uncast the current spell
					player.cast("uncast");
				}
			
				switch (keycode) {
					// pressed 1 - bolt spell
					case KEY.ONE:
					case KEY.Z:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "bolt";
						this.spellName = "Bolt";
						windowManager.modifyImage("spellHUD", "typeRune", "image", {image:boltRune});
						break;
					// pressed 2 - rune spell
					case KEY.TWO:
					case KEY.X:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "rune";
						this.spellName = "Rune";
						windowManager.modifyImage("spellHUD", "typeRune", "image", {image:runeRune});
						break;
					// pressed 3 - grenade spell
					case KEY.THREE:
					case KEY.C:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "grenade";
						this.spellName = "Grenade";
						windowManager.modifyImage("spellHUD", "typeRune", "image", {image:grenadeRune});
						break;
				}
				windowManager.modifyText("spellHUD", "spellCast", "text", {string: this.spellName, css: "14pt 'Bad Script'", color: "white"});
			}
			else
			// if spell element isn't set, set based on which key was pressed
			if (this.spellElement === "") {
				switch (keycode) {
					// pressed 1 - fire spell
					case KEY.ONE:
					case KEY.Z:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "fire";
						this.spellName += " of Fire";
						windowManager.modifyImage("spellHUD", "elementRune", "image", {image:fireRune});
						break;
					// pressed 2 - water spell
					case KEY.TWO:
					case KEY.X:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "water";
						this.spellName += " of Water";
						windowManager.modifyImage("spellHUD", "elementRune", "image", {image:waterRune});
						break;
					// pressed 3 - earth spell
					case KEY.THREE:
					case KEY.C:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "earth";
						this.spellName += " of Earth";
						windowManager.modifyImage("spellHUD", "elementRune", "image", {image:earthRune});
						break;
				}
				windowManager.modifyText("spellHUD", "spellCast", "text", {string: this.spellName, css: "14pt 'Bad Script'", color: "white"});
			}
			
			// uncast spell (cancel type/element) if the function was told to uncast the spell
			if (keycode === "uncast") {
				this.spellType = "";
				this.spellElement = "";
				this.spellName = "";
				windowManager.modifyText("spellHUD", "spellCast", "text", {string: this.spellName, css: "14pt 'Bad Script'", color: "white"});
				windowManager.modifyImage("spellHUD", "typeRune", "image", {image:emptyRune});
				windowManager.modifyImage("spellHUD", "elementRune", "image", {image:emptyRune});
				windowManager.deactivateUI("controlsHUD2");
				windowManager.deactivateUI("controlsHUD3");
				windowManager.activateUI("controlsHUD");
			}
			
			// cast spell if both type and element are set and the function was told to cast the spell
			if (this.spellType != "" && this.spellElement != "" && keycode === "cast") {
				// variable to store type of spell
				var type = {};
					
				// Get the right spell type
				switch (this.spellType) {
					// if it's a bolt
					case "bolt":
						// set type to right bolt element
						switch(this.spellElement) {
							case "fire":
								type = PROJECTILE_TYPE.FIREBOLT;
								break;
							case "water":
								type = PROJECTILE_TYPE.WATERBOLT;
								break;
							case "earth":
								type = PROJECTILE_TYPE.EARTHBOLT;
								break;
						}
						break;
					// if it's a rune
					case "rune":
						// set type to right rune element
						switch(this.spellElement) {
							case "fire":
								type = RUNE_TYPE.FIRE;
								break;
							case "water":
								type = RUNE_TYPE.WATER;
								break;
							case "earth":
								type = RUNE_TYPE.EARTH;
								break;
						}
						break;
					// if it's a grenade
					case "grenade":
						// set type to right grenade element
						switch(this.spellElement) {
							case "fire":
								type = PROJECTILE_TYPE.FIREGRENADE;
								break;
							case "water":
								type = PROJECTILE_TYPE.WATERGRENADE;
								break;
							case "earth":
								type = PROJECTILE_TYPE.EARTHGRENADE;
								break;
						}
						break;
				}
				
				// Only cast if the player has the mana
				if (this.mana >= type.cost) {
					// Player turns in the direction of the spell they cast
					this.xScale = Math.sign(worldMouse.position.x - this.position.x);
					if (this.xScale === 0) this.xScale = 1;	// catch if the mouse x = the player's x

					// Cast the spell
					if (this.spellType === "rune") {
						runes.push(new Rune(type));
					}
					else {
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2 - type.width/2, this.position.y+this.bounds.y/2 - type.height/2, worldMouse, type, false));
					}
					
					// Modify UI elements and pay spell cost
					windowManager.deactivateUI("controlsHUD3");
					windowManager.activateUI("controlsHUD");
					this.mana = Math.max(0, this.mana - type.cost);
				}
			}
		}
		
		// FUNCTION: main player object tick
		this.update = function() {
			// clamp health within 0 and max
			this.health = clamp(this.health, 0, this.maxHealth);
			
			// movement controls
			if (keys[KEY.A] && this.onGround)
				this.velocity.x -= 0.75;
			if (keys[KEY.D] && this.onGround)
				this.velocity.x += 0.75;
			
			// play varying footstep sounds on certain animation frames
			if (Math.abs(this.velocity.x) > 0) {
				if (Math.floor(this.time) === 0)
					playStream("footstep1.mp3", Math.min(1, Math.abs(this.velocity.x)/35));
				if (Math.floor(this.time) === 13)
					playStream("footstep2.mp3", Math.min(1, Math.abs(this.velocity.x)/35));
			}
			
			// Update bounding/physics/image variables based on player's state
			// change image based on state
			
			// update frameWidth/height and bounds based on image
			this.bounds = new Victor(				// the player's bounding box width and height, position is top left
				this.frameWidth,
				this.frameHeight
			);
				
			// update the player's physics
			this.updatePhysics.call(this);
			
			// lock within level
			this.position.x = clamp(this.position.x, 0, levelWidth() - this.bounds.x);
			
			// update cooldowns and regenerate health/mana
			if (this.cooldown > 0) --this.cooldown;
			if (this.damageTicks > 0) --this.damageTicks;
			if (this.health < this.maxHealth && this.damageTicks <= 0) this.health = Math.min(this.maxHealth, this.health + 0.025);
			if (this.mana < this.maxMana) this.mana = Math.min(this.maxMana, this.mana + 0.65);
			
			// DRAW: draw the player
			this.draw();
		}
		
		// FUNCTION: main player draw call
		this.draw = function() {
			offCtx.save();
				offCtx.translate(-screenX + this.position.x + this.frameWidth/2, this.position.y);
				offCtx.scale(this.xScale, 1);
				
				// increment timing for animation based on horizontal move speed
				if (keys[KEY.A] || keys[KEY.D]) {
					this.time += Math.max(0.5, (0.75*Math.abs(this.velocity.x)/7));
					this.time = this.time % 28;
					this.currentImg = playerRun;
				}
				else {
					this.currentImg = playerToIdle;
					this.time = 27 - (27 * Math.abs(this.velocity.x)/7);
				}
				
				this.frameWidth = this.currentImg.width/28; 	// width of 1 frame from the spritesheet
				this.frameHeight = this.currentImg.height;	// height of 1 frame from the spritesheet
				
				offCtx.drawImage(this.currentImg, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, -this.frameWidth/2 + this.offset.x/2, this.offset.y, this.frameWidth, this.frameHeight);
				
			offCtx.restore();
		}
	}
 
	// CLASS: projectile
	function Projectile(x, y, towards, projType, enemy) {
		MobileObject.call(this);
		
		this.projType = projType;					// what type of projectile it is, determines its properties
		this.enemyProj = enemy; 					// whether an enemy fired it (only hits players)
		this.speed = this.projType.velocity;		// speed projectile travels at
		this.gravity = this.projType.gravity;		// whether or not it's affected by gravity
		this.numBounces = 0;						// number of times this has bounced - used by grenades
		this.time = rand(0, 100);
		this.system = {};
		this.light = {};
		
		// the projectile's bounding box
		this.bounds = new Victor(this.projType.width, this.projType.height);
		// starting projectile position
		this.position = new Victor(x, y);
		
		// starting projectile velocity
		// directs itself towards the "towards" object passed in
		if (towards != undefined)
			if (towards.position != undefined)
				this.velocity = this.vecToOther(towards).norm().multiply(Victor(this.speed, this.speed));
			else
				this.velocity = Victor().subtract(this.position).norm().multiply(Victor(this.speed, this.speed));
		else
			this.velocity = Victor().subtract(this.position).norm().multiply(Victor(this.speed, this.speed));
		
		// play the projectile's shooting sound
		if (this.projType.launchSnd != "")
			playStream(this.projType.launchSnd, 0.5);
						
		// give starting angle to enemy projectiles
		if (this.enemyProj)
			this.time = this.velocity.angle();
			
		// attach a light source and particle system based on the types declared in the projectile enum
		if (this.projType.particle != undefined) {
			this.system = new ParticleSystem(this, this.projType.particle, -1, this.projType.particleLifetime, this.projType.particlesPerFrame);
			particleSystems.push(this.system);
		}
		if (this.projType.color != {}) {
			this.light = new LightSource(this, this.projType.color, this.projType.width*4, -1, true, true, 1);
			lightSources.push(this.light);
		}
		
		// FUNCTION: gives a generalized string that portrays its projectile type
		this.type = function() {
			if (this.projType === PROJECTILE_TYPE.FIREBOLT || this.projType === PROJECTILE_TYPE.WATERBOLT || this.projType === PROJECTILE_TYPE.EARTHBOLT)
				return "bolt";
			if (this.projType === PROJECTILE_TYPE.FIREGRENADE || this.projType === PROJECTILE_TYPE.WATERGRENADE || this.projType === PROJECTILE_TYPE.EARTHGRENADE)
				return "grenade";
		}
	
		// FUNCTION: gives a generalized string that portrays its element
		this.element = function() {
			if (this.projType === PROJECTILE_TYPE.FIREBOLT || this.projType === PROJECTILE_TYPE.FIREGRENADE)
				return "fire";
			if (this.projType === PROJECTILE_TYPE.WATERBOLT || this.projType === PROJECTILE_TYPE.WATERGRENADE)
				return "water";
			if (this.projType === PROJECTILE_TYPE.EARTHBOLT || this.projType === PROJECTILE_TYPE.EARTHGRENADE)
				return "earth";
		}
		
		// HELPER: returns the y value of velocity normed, good for scaling things based on impact
		this.ySpeed = function() { return Math.abs(this.velocity.clone().norm().y); }
		
		// FUNCTION: main projectile object tick
		this.update = function() {	
			// handle hitting terrain
			if (this.position.y + this.bounds.y > TERRAIN_HEIGHT) {
				// play its terrain collision sound effect
				if (this.projType.impactSnd) playStream(this.projType.impactSnd, 0.2*this.ySpeed());
				
				// for bolts, they just explode (disappear)
				if (this.type() === "bolt") {
					// create a quick 'particle burst'
					if (this.projType.particleExplode != {})
						particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: this.bounds.clone()}, this.projType.particle, 1, this.projType.particleLifetime, Math.min(Math.max(0.5, this.projType.particlesPerFrame)*20, 40)));
					// splice out the projectile's particle system, and itself
					particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
					projectiles.safeSplice(projectiles.indexOf(this), 1);
					// begin the light source's death
					this.light.root = "dying";
				}
					
				// for grenades, they bounce
				if (this.type() === "grenade") {
					this.position.y = TERRAIN_HEIGHT - this.bounds.y;
					this.velocity.multiply(Victor(0.7, -0.8));
					++this.numBounces;
				}
			}
			
			// if the projectile is out of the level, delete it and its attachments
			if (!inLevel(this)) {
				// splice out the projectile's particle system, and itself
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				projectiles.safeSplice(projectiles.indexOf(this), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
			}
			
			// update the projectile's physics
			this.updatePhysics.call(this);
			
			// whether the projectile has collided with something
			var victim = "" // stores who/what the projectile hit
			
			// explode once it's finished its 3rd bounce
			if (this.numBounces >= 3)
				victim = this;
				
			// Check player collisions if it's an enemy projectile
			if (this.enemyProj && this.overlaps(player)) {
				victim = player;
			}
			
			// For player projectiles, check enemy and enemy projectile collisions
			if (!this.enemyProj) {
				// loop through enemies
				for (var i = 0; i < enemies.length; ++i) {
					// check if the projectile is hitting the enemy
					if (this.overlaps(enemies[i])) {
						victim = enemies[i];
						break;
					}
				}
				
				// loop through enemy projectiles
				for (var i = 0; i < projectiles.length; ++i) {
					// check if the projectiles are hitting
					if (this.overlaps(projectiles[i]) && projectiles[i] != this && projectiles[i].enemyProj) {
						victim = projectiles[i];
						break;
					}
				}
			}
			
			// if it has a hit something
			if (victim != "") {
				// damage non-projectiles
				if (!(victim instanceof Projectile)) {
					victim.velocity = Victor(this.velocity.x/2, -this.projType.strength/2);
					--victim.position.y;
						
					// damage the victim
					victim.damage(this.projType.strength);
					if (this.projType.impactSnd) playStream(this.projType.impactSnd, 0.2*this.ySpeed());
					
					// if this projectile is fire based, ignite the enemy and give
					// them a flame particle system if it's not already on fire
					if (this.element() === "fire") {
						if (victim.fireTicks <= 0)
							particleSystems.push(new ParticleSystem(victim, PARTICLE_TYPE.BURN, 60, 15, 1));
						victim.fireTicks = 60;
					}
				}
				// otherwise, we hit a projectile - delete it
				else {
					particleSystems.safeSplice(particleSystems.indexOf(victim.system), 1);
					projectiles.safeSplice(projectiles.indexOf(victim), 1);
					victim.light.root = "dying";
				}
				
				// if this is a grenade, loop enemies and do an AOE
				if (this.type() === "grenade") {
					for (var i = 0; i < enemies.length; ++i) {
						// get the looped enemy and the distance from it
						var enemy = enemies[i];
						var distance = this.position.clone().subtract(enemy.position.clone()).length();
						
						// don't damage the enemy who was hit again
						if (enemy != victim) {
							// if close enough, deal damage based on distance
							if (distance < 200) {
								var scalar = (200 - distance)/200;
								var vel = enemy.velocity.y;
								enemy.velocity = Victor(this.velocity.x/2, -this.projType.strength/2).multiply(Victor(scalar, scalar));
								--enemy.position.y;
								enemy.damage(this.projType.strength * scalar);
								
								// if this grenade is fire based, ignite the enemy and give
								// them a flame particle system if it's not already on fire
								// ignition length and particle lifetime is based on distance scalar
								if (this.element() === "fire") {
									if (enemy.fireTicks <= 0)
										particleSystems.push(new ParticleSystem(enemy, PARTICLE_TYPE.BURN, 60 * scalar, 15, 1));
									enemy.fireTicks = 60 * scalar;
								}
							}
						}
					}
					
					// push grenade explosion particle system
					if (this.projType.particle != undefined)
						particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: this.bounds.clone()}, this.projType.particle, 1, this.projType.particleLifetime, this.projType.strength*3));
					
					// play the grenade's breaking sound
					playStream(this.projType.breakSnd, 1);
				}
				else {
					// for bolts create a quick 'particle burst' as if the projectile shattered
					if (this.projType.particle != undefined)
						particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: this.bounds.clone()}, this.projType.particle, 1, this.projType.particleLifetime, Math.min(Math.max(0.5, this.projType.particlesPerFrame)*20, 40)));
				}
				
				// delete this one
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				projectiles.safeSplice(projectiles.indexOf(this), 1);
				// begin the light source's death
				this.light.root = "dying";
				return;
			}
				
			// DRAW: draw the projectile if it's on screen
			if (onScreen(this))
				this.draw();
		}
	
		// FUCNTION: main projectile draw call
		this.draw = function() {
			// Rotation increments based on y speed for player projectiles
			if (!this.enemyProj)
				this.time += this.velocity.clone().norm().x/7;
			
			offCtx.save();
			offCtx.translate(-screenX + this.position.x + this.bounds.x/2, this.position.y + this.bounds.y/2);
			offCtx.rotate(this.time);
			offCtx.drawImage(this.projType.img, -this.bounds.x/2, -this.bounds.y/2);
			offCtx.restore();
		}
	}
	
	// CLASS: rune, a magical mine the player can place
	function Rune(runeType) {
		GameObject.call(this);
		
		// assign starting variables
		this.runeType = runeType;
		this.position = new Victor(worldMouse.position.x - this.runeType.width/2, TERRAIN_HEIGHT - this.runeType.width/2);
		this.bounds = new Victor(this.runeType.width, this.runeType.width);
		this.light = {};
		this.system = {};
		this.alpha = 0;
		
		// create particle system and light based on rune type
		//this.system = new ParticleSystem(this, this.projType.particle, -1, this.projType.particleLifetime, this.projType.particlesPerFrame);
		this.light = new LightSource(this, this.runeType.color, this.bounds.x, -1, false, true, 0);
		//particleSystems.push(this.system);
		lightSources.push(this.light);
		// play rune activate noise
		playStream("runePlace.mp3", 0.1);
		
		
		// Update - checks if enemies have triggered the rune
		this.update = function() {
			// variable to store whether an enemy/enemies triggered the rune
			var triggered = false;
			
			// loop enemies
			for (var i = 0; i < enemies.length; ++i) {
				// get current one
				var e = enemies[i];
				
				// check if enemy is above rune's center and is on the ground
				if (e.position.x + e.bounds.x > this.position.x + this.bounds.x/2 && e.position.x < this.position.x + this.bounds.x/2 && e.onGround) {
					triggered = true;
				
					// damage and knock up the enemy
					e.damage(this.runeType.strength);
					e.velocity.y = -this.runeType.strength/2;
					--e.position.y;
					
					// create a quick 'particle burst'
					particleSystems.push(new ParticleSystem({position: Victor(this.position.x + this.bounds.x/2, this.position.y), bounds: new Victor()}, this.runeType.particle, 1, this.runeType.particleLifetime, Math.min(Math.max(0.5, this.runeType.particlesPerFrame)*20, 40)));
				}
			}
					
			// if the rune was triggered, remove this rune, its particle system, and its light source from the global lists
			if (triggered) {
				runes.safeSplice(runes.indexOf(this), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				return;
			}
			
			// draw the rune as a postprocess if it's on screen
			if (onScreen(this))
				postProcesses.push(this.draw.bind(this));
		}
		
		// Draw
		// Called as a postprocesses
		this.draw = function() {
			// fade the rune into existence
			if (this.alpha < 1) {
				this.alpha += 0.01;
				this.light.alpha = this.alpha;
			}
		
			// draw the rune on the ground
			ctx.save();
				ctx.globalAlpha = this.alpha;
				var grad = ctx.createLinearGradient(-screenX + this.position.x, this.position.y - this.runeType.width/2, -screenX + this.position.x, this.position.y + this.runeType.width/2);
				grad.addColorStop(0, colorString(this.runeType.color, 0));
				grad.addColorStop(1, colorString(this.runeType.color, 0.5));
				ctx.fillStyle = grad;
				//ctx.fillRect(-screenX + this.position.x, this.position.y - this.runeType.width/2, this.runeType.width, this.runeType.width);
				ctx.drawImage(this.runeType.img, -screenX + this.position.x, this.position.y - this.runeType.width/4);
			ctx.restore();
		}
	}
	
	// CLASS: enemy object
	function Enemy(enemyType) {
		MobileObject.call(this);
		
		/* VARIABLES */
		this.enemyType = enemyType;		// what type of enemy this is
		this.time = 0; // controls sprite animation timing
		this.health = this.maxHealth = this.enemyType.health; // get health and max health of this enemy type
		this.frameWidth = this.enemyType.img.width/28; // width of 1 frame from the spritesheet
		this.frameHeight = this.enemyType.img.height;  // height of 1 frame from the spritesheet
		this.offset = new Victor(this.frameWidth/-4, this.frameHeight/-4); // enemys's image offset
		this.bounds = new Victor(
			this.enemyType.width,
			this.enemyType.height
		);
		this.position = new Victor(		// starting enemy position
			screenX + canvas.width + this.frameWidth,
			TERRAIN_HEIGHT - this.bounds.y*1.5
		);
		
		// flying enemies spawn at the top of the screen and shoot projectiles
		if (this.enemyType.AI === "flying") {
			this.position.y = 0;
		}
		
		// some spawn on left of screen instead
		if (Math.random() < 0.5) this.position.x = screenX - this.frameWidth*2;
		
		// FUNCTION: main enemy object tick
		this.update = function() {
			// check if enemy is dead
			if (this.health <= 0) {
				// award points equal to its starting health
				player.gainExperience(this.maxHealth);
				
				// delete this one
				enemies.safeSplice(enemies.indexOf(this), 1);
				return;
			}
			
			// lose health from active DOTs
			if (this.fireTicks > 0) {
				--this.fireTicks;
				this.health -= 0.05;
			}
			
			// Enemies stop most of their checks and update if they're far enough off screen
			if (Math.abs(player.position.x - this.position.x) < canvas.width*1.5) {
				// always move towards the player's other side
				this.targetPos = player.position.clone();
				this.targetPos.x += player.bounds.x * this.xScale;
				
				// bobbing for flying enemies, and target above the player
				if (this.enemyType.AI === "flying") {
					this.position.y += Math.sin(time/10);
					this.targetPos.y -= this.bounds.y*4;
					
					// randomly shoot projectiles
					if (Math.random() < 0.001 && currentGameState != GAME_STATE.PAUSED && onScreen(this))
						projectiles.push(new Projectile(this.position.x, this.position.y, player, this.enemyType.projectile, true));
				}
				
				// contact with player
				if (this.overlaps(player) && player.damageTicks <= 0) {
					player.damage(this.enemyType.strength);
					player.jump(this.enemyType.strength, 1);
				}
				
				// if it's a flying enemy, it uses true homing
				if (this.enemyType.AI === "flying")
					this.velocity = this.targetPos.clone().subtract(this.position).norm().multiply(Victor(2, 2.5));
				// otherwise, only set x velocity
				else
					// doesn't move if off ground
					if (this.onGround)
						this.velocity.x = Math.sign(this.targetPos.clone().subtract(this.position).x);
					else
						this.velocity.x = 0;
				
				this.updatePhysics();
			}
			
			// DRAW: draw the enemy if it's on screen
			if (onScreen(this))
				this.draw();
		}
	
		// FUCNTION: main enemy draw call
		this.draw = function() {
			// increment timing for animation
			if ((this.onGround || this.enemyType.AI === "flying") && Math.abs(this.velocity.x) > 0)
				this.time = (this.time+0.75) % 28;
			else {
				if (Math.abs(this.velocity.x) > 0)
					if (this.time != 0 && this.time != 13)
						this.time = Math.round(this.time+1) % 28;
				else
					if (this.time != 7 && this.time != 20)
						this.time = Math.round(this.time+1)
			}
					
			offCtx.save();
				offCtx.save();
				offCtx.translate(-screenX + this.position.x + this.bounds.x/2, this.position.y + this.bounds.y/2);
				offCtx.scale(this.xScale, 1);
				offCtx.drawImage(this.enemyType.img, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, (-this.bounds.x/2 + this.offset.x), -this.bounds.y/2 + this.offset.y, this.frameWidth, this.frameHeight);
				offCtx.restore();
			offCtx.restore();
		}
	}
 
	// CLASS: particle system
	function ParticleSystem(root, particleType, lifetime, particleLifetime, particlesPerFrame) {
		// assign starting variables
		this.root = root;						// the object this is linked to
		this.position = root.position.clone();	// system's position
		this.time = 0;							// system's time lived
		
		// update particle system
		this.update = function() {
			// check if root is gone
			var rootGone = false;
			if (this.root instanceof Enemy)
				rootGone = (enemies.indexOf(this.root) === -1);
			if (this.root instanceof Projectile)
				rootGone = (projectiles.indexOf(this.root) === -1);
			if (this.root instanceof Particle)
				rootGone = (particles.indexOf(this.root) === -1);
			// delete this if its root is gone
			if (rootGone) {
				particleSystems.safeSplice(particleSystems.indexOf(this), 1);
				return;
			}
		
			// stick to the root object
			this.position = root.position.clone().add(root.bounds.clone().divide(Victor(2, 2)));
		
			// attempt to create new particles
			if (particlesPerFrame >= 1) {
				for (var i = 0; i < particlesPerFrame; ++i)
					particles.push(new Particle(this, particleType, particleLifetime));
			}
			// only a chance to create one if <1 per frame
			else if (Math.random() < particlesPerFrame)
				particles.push(new Particle(this, particleType, particleLifetime));
			
			// increment time lived
			++this.time;
			// delete this system if its time lived has surpassed its lifetime
			if (this.time > lifetime && lifetime > 0) {
				particleSystems.safeSplice(particleSystems.indexOf(this), 1);
			}
		}
	}
	
	// CLASS: particle
	function Particle(parent, particleType, lifetime) {
		// inherits from MobileGameObject
		MobileObject.call(this);
	
		// assign starting variables
		this.onGround = false;
		this.parent = parent;
		this.particleType = particleType;	// what type of particle this is
		this.deathTime = 0; 				// used to kill particles if they don't die naturally
		this.lifetime = lifetime;
		this.position = new Victor(parent.root.position.x + parent.root.bounds.x/10 + Math.random()*parent.root.bounds.x*0.8, parent.root.position.y + parent.root.bounds.y/10 + Math.random()*parent.root.bounds.y*0.8);
		this.velocity = this.particleType.vel.call(this);
		this.bounds = new Victor(3, 3);
		this.light = {};
		this.time = 0;
		
		// make a small light source around the particle depending on its type
		if (this.particleType.lighting) {
			this.light = new LightSource(this, globalFire(), 12, -1, false, true, 1);
			lightSources.push(this.light);
		}
		
		// update particle
		this.update = function() {
			// affected by gravity based on particle type
			// don't simulation physics for landed particles
			if (!this.onGround) {
				if (this.particleType.gravity)
					this.updatePhysics();
				else
					this.position.add(this.velocity);
			}
			
			// increment death timer if the particle is barely moving
			if (this.velocity.length() < 0.1 || this.onGround)
				++this.deathTime;
			// increment time lived
			++this.time;
			
			// delete this particle if its time lived has surpassed its lifetime, if it has been still for 100 ticks,
			// or if it has moved offscreen
			if ((this.time > this.lifetime && this.lifetime > 0) || this.deathTime > 50 ||
				 this.position.x < screenX || this.position.x > screenX + canvas.width || this.position.y < 0 || this.position.y > canvas.height) {
				particles.safeSplice(particles.indexOf(this), 1);
				// delete its light source if it has one
				if (this.particleType.lighting)
					lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				return;
			}
			
			// Draw particle as a post-process if it's on screen
			if (onScreen(this))
				postProcesses.push(this.draw.bind(this));
		}
		
		// Draw particle
		this.draw = function() {
			// draw based on particle type
			if (this.deathTime > 0) {
				ctx.save();
				ctx.globalAlpha = (50 - this.deathTime)/50;
				ctx.drawImage(this.particleType.img, this.position.x, this.position.y);
				ctx.restore();
			}
			else
				ctx.drawImage(this.particleType.img, -screenX + this.position.x, this.position.y);
		}
	}
 
	// CLASS: particle system
	function LightSource(root, color, radius, lifetime, flicker, visible, alpha) {
		// assign starting variables
		this.visible = visible;					// whether or not to actually draw the light; false makes an "anit-fog of war" (visibility vs. light)
		this.root = root;						// the object this is linked to
		this.position = this.root.position;		// light's position
		this.bounds = new Victor(radius*2, radius*2); // basic bounds
		this.radius = radius;					// outer radius of the light
		this.baseColor = color;					// base color of the light
		this.alpha = alpha;						// light's alpha (transparency)
		this.color = colorString(this.baseColor, this.alpha); // the true current color of the source's light, passed as rgb object literal for use in draw call
		this.offset = new Victor();				// the offset of a light source; displays at root's position + offset
		
		// Changes the light source's offset
		this.setOffset = function(vector) {
			this.offset = vector;
		}
		
		// Update light source system
		this.update = function() {
			// Update color in case a color variable updated
			this.color = colorString(this.baseColor, this.alpha);
			// Update bounds in case radius changes
			this.bounds = new Victor(this.radius*2, this.radius*2);
		
			// delete this if its root is gone or it's too small to draw
			if (this.root == undefined || (this.radius < 1 && !(this.root instanceof Waystone))) {
				lightSources.safeSplice(lightSources.indexOf(this), 1);
				return;
			}
			
			// if the root is instead set to "dying", shrink the light
			if (this.root === "dying") {
				this.radius *= 0.9;
				--this.radius;
			}
			else {
				// stick to root object
				this.position = this.root.position.clone().add(this.root.bounds.clone().divide(Victor(2, 2))).add(this.root.offset.clone());
				
				// flicker radius if flicker is enabled
				if (flicker)
					this.radius = clamp(this.radius * rand(0.99, 1.01), radius*0.9, radius*1.1);
				
				// increment time lived
				++this.time;
				// delete this system if its time lived has surpassed its lifetime
				if (this.time > lifetime && lifetime > 0) {
					lightSources.safeSplice(lightSources.indexOf(this), 1);
				}
			}
			
			// Draw call: set light to be drawn as a postprocess
			// Particles don't draw an actual colored glow for performance reasons
			// We pass in a fake object to onScreen() to represent the light's bounding box
			if (!(this.root instanceof Particle) && visible && onScreen({position: Victor(this.position.x + this.offset.x - this.radius, this.position.y + this.offset.y - this.radius), bounds: this.bounds}))
				postProcesses.push(this.draw.bind(this));
		}
		
		//== Draw the light source
		// This is only ever called as a post-process
		this.draw = function() {
			// get a vector of the light's adjusted screen position
			var adjPos = new Victor(-screenX + this.position.x + this.offset.x, this.position.y + this.offset.y);
			// create a radial gradient of the light's color
			var radial = ctx.createRadialGradient(adjPos.x, adjPos.y, Math.max(this.radius, 0), adjPos.x, adjPos.y, 0);
			radial.addColorStop(0, colorString(color, 0));
			radial.addColorStop(0.2, colorString(color, 0.05*this.alpha));
			radial.addColorStop(1, colorString(color, 0.3*this.alpha));
			ctx.fillStyle = radial;
			// draw the gradient
			ctx.beginPath();
			ctx.arc(adjPos.x, adjPos.y, Math.max(this.radius, 0), 0, Math.PI*2, false);
			ctx.globalCompositeOperation = "lighter";
			ctx.fill();
			ctx.globalCompositeOperation = "overlay";
			ctx.fill();
		}
	}
	
	// PAUSE FUNCTION: pauses the game
	function pauseGame() {
		// since pause can be called multiple ways
		// prevents multiple redraws of pause screen
		if (currentGameState === GAME_STATE.IDLE) {
			currentGameState = GAME_STATE.PAUSED;
			bgAudio.pause();
			
			// draw the pause screen
			deactivateHUD();
			windowManager.activateUI("pauseScreen");
			// force one tick to update paused behaviors
			update();
		}
	}
	
	// RESUME FUNCTION: resumes the game
	function resumeGame() {
		// Only unpaused if we're actually paused
		// Prevents accidental ticking resumes
		if (currentGameState === GAME_STATE.PAUSED) {
			currentGameState = GAME_STATE.IDLE;
			bgAudio.play();
			
			// deactivate pause menu
			activateHUD();
			windowManager.deactivateUI("pauseScreen");
		}
	}
	
	// FUNCTION: activate game HUD
	function activateHUD() {
		windowManager.activateUI("controlsHUD");
		windowManager.activateUI("spellHUD");
	}
	
	// FUNCTION: deactivate game HUD
	function deactivateHUD() {
		windowManager.deactivateUI("controlsHUD");
		windowManager.deactivateUI("spellHUD");
	}
	
	// FUNCTION: do things based on key presses
	function keyPress(e, simulated) {
		// initialize value at keycode to false on first press
		if (keys[e.keyCode] === undefined)
			keys[e.keyCode] = false;
		
		// send it to the player if they're not casting already
		if (player.cooldown <= 0)
			player.cast(e.keyCode);
		
		// spacebar
		if (e.keyCode === KEY.SPACE || e.keyCode === KEY.W) {
			if (player)
				player.jump(8, 1);
			
			// prevent spacebar page scrolling
			e.preventDefault();
		}

		// p - toggle game paused
		if (e.keyCode === KEY.P) {
			// check if paused, and toggle it
			if (currentGameState === GAME_STATE.PAUSED)
				resumeGame();
			else if (currentGameState === GAME_STATE.IDLE)
				pauseGame();
		}
		
		// set the keycode to true
		// we do this last so we can check if this is the first tick it's pressed
		if (!simulated)
			keys[e.keyCode] = true;
	}
	
	// FUNCTION: do things based on key releases
	function keyRelease(e, simulated) {
		if (!simulated)
			keys[e.keyCode] = false;
		
		if (e.keyCode === KEY.SPACE) {
			// prevent spacebar page scrolling
			e.preventDefault();
			 
			// if the player has died, restart the game
			if (currentGameState === GAME_STATE.DEAD) {
				currentGameState = GAME_STATE.START;
				windowManager.deactivateUI("all");
				windowManager.toggleUI("titleScreen");
			}
			// if we're in between levels, move on to the next one
			if (currentGameState === GAME_STATE.BETWEEN) {
				// disable upgrade shop UI
				windowManager.toggleUI("shopHUD");
				setupLevel();
			}
		}
	}
	
	// FUNCTION: calculate the delta time, used for animation and physics
	function calculateDeltaTime() {
		var now, fps;
		now = (+new Date); 
		fps = 1000 / (now - lastTime);
		fps = clamp(fps, 12, 60);
		lastTime = now; 
		return 1/fps;
	}
	
	// return public interface for engine module
	return {
		init: init,
		player: player,
		setupGame: setupGame,
		setupLevel: setupLevel,
		loadAssets: loadAssets,
		playStream: playStream,
		update: update,
		pauseGame: pauseGame,
		resumeGame: resumeGame,
		requestFullscreen: requestFullscreen,
		keyPress: keyPress,
		keyRelease: keyRelease
	}
}());