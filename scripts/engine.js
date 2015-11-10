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
	var canvas,ctx;				// canvas references
	var offCanvas, offCtx;		// offscreen canvas references
	var mouseX, mouseY;			// mouse coordinates
	var animationID;			// stores animation ID of animation frame
	var paused = false;			// if the game is paused
	var mouseDown = false;		// if the mouse is being held down
	var uiClicked = false;		// if UI was clicked
	var mouse = {}				// the mouse object
	var lastTime = (+new Date); // used with calculateDeltaTime
	var dt = 0;					// delta time
	var time = 0;
	//}
	
	//== ASSETS ==//{
	var background = new Image();
	var cloud = new Image();
	var star = new Image();
	//}
	
	//== GAME VARIABLES ==//{
	//== General
	var GAME_STATE = {			// "enum" of the current status of the game
		START: 0,				// start screen
		IDLE: 1,				// level is sitting idly
		CASTING: 2,				// player is in the process of building a spell
		BETWEEN: 3,				// between level upgrade
		DEAD: 4,				// game over screen
		HIGHSCORE: 5			// viewing the high score table
	}
	var currentGameState = GAME_STATE.START; // what is currently happening in the game
	var currentLevel = 0;		// what level the player is on
	var keys = [];				// array to store pressed keys
	var experience = 0;			// increases like score, but can be spent for upgrades
	var score = 0;				// current score, = number of terrain objects passed
	var highScores = [];		// array of high scores when they're loaded in
	var postProcesses = [];		// an array that stores callbacks to object draws that should be called after shading is applied
	//
	
	//== Player
	var player = {};			// the player object
	//== Level
	var TERRAIN_WIDTH = 100;	// width of a terrain tile
	var TERRAIN_HEIGHT = 0; 	// height of terrain from the bottom of the screen
	var level = [];				// array storing the map of the current level
	var screenX = 0;			// current horizontal position of camera in level
	//== Enemies
	var enemies = [];
	var ENEMY_TYPES = {
		GATOR: {
			name: "GATOR",
			health: 75,
			img: new Image(),
			width: 100,
			height: 60,
			AI: "running"
		},
		RAT: {
			name: "Rat",
			health: 55,
			img: new Image(),
			width: 100,
			height: 50,
			AI: "standing"
		},
		BAT: {
			name: "Bat",
			health: 50,
			img: new Image(),
			width: 85,
			height: 50,
			AI: "flying"
		}
	}
	//== Light Sources
	var lightSources = [];
	// helper functions
	var globalFire = function() { return {r: 225, g: 175, b: 20}; };
	var globalWater = function() { return {r: 20, g: 100, b: 200}; };
	var globalEarth = function() { return {r: 20, g: 200, b: 50}; };
	//== Particle Systems
	var particleSystems = [];
	var particles = [];
	var PARTICLE_TYPES = {		// enum storing particle type info
		FLAME: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-1, 1)); },
			img: new Image()
		},
		WATERDRIP: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(0, 1); },
			img: new Image()
		},
		EARTH: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, 1)); },
			img: new Image()
		},
		FLAMEFOUNTAIN: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -10)); },
			img: new Image()
		},
		WATERFOUNTAIN: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -22)); },
			img: new Image()
		},
		EARTHFOUNTAIN: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(rand(-1, 1), rand(-5, -22)); },
			img: new Image()
		}
	}
	//== Projectiles
	var projectiles = [];
	var PROJECTILE_TYPES = {
		FIREBOLT: {
			strength: 15,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: false,
			velocity: 15,
			cooldown: 30,
			color: globalFire(),
			particle: PARTICLE_TYPES.FLAME,
			particleLifetime: 6,
			particlesPerFrame: 3
		},
		WATERBOLT: {
			strength: 9,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: false,
			velocity: 22,
			cooldown: 20,
			color: globalWater(),
			particle: PARTICLE_TYPES.WATERDRIP,
			particleLifetime: 20,
			particlesPerFrame: 1
		},
		EARTHBOLT: {
			strength: 27,
			img: new Image(),
			width: 40,
			height: 40,
			gravity: true,
			velocity: 20,
			cooldown: 60,
			color: globalEarth(),
			particle: PARTICLE_TYPES.EARTH,
			particleLifetime: -1,
			particlesPerFrame: 0.1
		},
		FIREGRENADE: {
			strength: 15,
			img: new Image(),
			width: 55,
			height: 55,
			gravity: true,
			velocity: 13,
			cooldown: 90,
			color: globalFire(),
			particle: PARTICLE_TYPES.FLAME,
			particleLifetime: 6,
			particlesPerFrame: 3
		},
		WATERGRENADE: {
			strength: 12,
			img: new Image(),
			width: 75,
			height: 75,
			gravity: true,
			velocity: 15,
			cooldown: 60,
			color: globalWater(),
			particle: PARTICLE_TYPES.WATERDRIP,
			particleLifetime: 20,
			particlesPerFrame: 1
		},
		EARTHGRENADE: {
			strength: 20,
			img: new Image(),
			width: 65,
			height: 65,
			gravity: true,
			velocity: 10,
			cooldown: 110,
			color: globalEarth(),
			particle: PARTICLE_TYPES.EARTH,
			particleLifetime: -1,
			particlesPerFrame: 0.1
		}
	}
	//== Runes
	var RUNE_TYPES = {
		FIRE: {
			width: 130,
			strength: 15,
			color: globalFire(),
			particle: PARTICLE_TYPES.FLAMEFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 3
		},
		WATER: {
			width: 100,
			strength: 25,
			color: globalWater(),
			particle: PARTICLE_TYPES.WATERFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 1
		},
		EARTH: {
			width: 160,
			strength: 10,
			color: globalEarth(),
			particle: PARTICLE_TYPES.EARTHFOUNTAIN,
			particleLifetime: -1,
			particlesPerFrame: 0.1
		}
	}
	var runes = [];
	//}
	
	//== PHYSICS VARIABLES ==//
	var GRAVITY = 40;			// global gravity - this*dt added to velocity.y
	var inControl = function() { return currentGameState === GAME_STATE.IDLE || currentGameState === GAME_STATE.CASTING; }
	
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
		// SETUP: canvas and audio
		// canvas
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext("2d");
		// offscreen canvas
		offCanvas = document.createElement("canvas");
		offCanvas.width = canvas.width; offCanvas.height = canvas.height;
		offCtx = offCanvas.getContext("2d");
		
		// set terrain height now that canvas is loaded
		TERRAIN_HEIGHT = canvas.height - 150;
		
		// get reference to audio element
		bgAudio = document.querySelector('#bgAudio');
		
		// load default song and title, and play
		//playStream(sfxPlayer);
		loadAssets();
		
		// taps working as jumps 
		canvas.addEventListener("mousedown", function(e) {
			mouseDown = true;
			e.preventDefault();
			
			// check for mouse presses on the UI
			uiClicked = game.windowManager.checkMouse(e);
			
			// run game actions if the UI was not clicked
			if(!uiClicked){				
				// if the player is dead, restart the game
				if (currentGameState === GAME_STATE.DEAD) {
					setupGame();
				}
				
				// if the player is alive and not casting, attempt a spell cast
				if (currentGameState === GAME_STATE.IDLE)
					player.cast("cast", getMouse(e));
			}
		}.bind(this));
		// compatibility for touch devices
		canvas.addEventListener("touchstart", function(e) { 
			mouseDown = true;
			e.preventDefault();
			
			// check for mouse presses on the UI
			uiClicked = game.windowManager.checkMouse(e);
			
			// run game actions if the UI was not clicked
			if(!uiClicked){
				// if the player is dead, restart the game
				if (currentGameState == GAME_STATE.DEAD) {
					setupGame();
				}
			}
		}.bind(this));
		// track mouse position
		canvas.addEventListener("mousemove", function(e) { mouse = getMouse(e) });
		// taps working as jumps
		canvas.addEventListener("mouseup", function(e) { mouseDown = false; });
		canvas.addEventListener("touchend", function(e) { mouseDown = false; });
		
		// callback for button presses
		window.addEventListener("keydown", keyPress);
		// callback for button presses
		window.addEventListener("keyup", keyRelease);
		
		//== Register Title Screen UI ==//
		windowManager.makeUI("titleScreen", 0, 0, canvas.width, canvas.height);
		var grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
		grad.addColorStop(0, "rgb(0, 0, 50)");
		grad.addColorStop(1, "rgb(10, 10, 10)");
		windowManager.modifyUI("titleScreen", "fill", {color: grad});
		// start game button
		windowManager.makeButton("titleScreen", "startButton", 60, 5*canvas.height/6, canvas.width/8, canvas.height/12, function() {game.engine.setupGame();});
		windowManager.modifyButton("titleScreen", "startButton", "fill", {color: "#3C3C3C"});
		windowManager.modifyButton("titleScreen", "startButton", "border", {color: "#222", width: 4});
		windowManager.modifyButton("titleScreen", "startButton", "text", {string: "Start", css: "24pt 'Uncial Antiqua'", color: "rgb(250, 255, 195)"});
		// game title
		windowManager.makeText("titleScreen", "title", 50, 50, "default", "default", "Lumina", "40pt 'Uncial Antiqua'", "rgb(250, 255, 195)");
		windowManager.toggleUI("titleScreen");
		
		//== Register In-Game Spell Type HUD ==//
		windowManager.makeUI("controlsHUD", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD", "spellType1", 0, 0, 250, "default", "Press to choose type: ", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD", "spellType2", 0, 20, 150, "default", "1 - Bolt", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD", "spellType3", 0, 40, 150, "default", "2 - Rune", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD", "spellType4", 0, 60, 150, "default", "3 - Grenade", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeUI("controlsHUD2", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD2", "spellElement1", 0, 0, 300, "default", "Press to choose element: ", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD2", "spellElement2", 0, 20, 150, "default", "1 - Fire", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD2", "spellElement3", 0, 40, 150, "default", "2 - Water", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeText("controlsHUD2", "spellElement4", 0, 60, 150, "default", "3 - Earth", "14pt 'Uncial Antiqua'", "white");
		windowManager.makeUI("controlsHUD3", 10, 5, canvas.width/4, 90);
		windowManager.makeText("controlsHUD3", "cast1", 0, 0, 250, "default", "Click to cast", "14pt 'Uncial Antiqua'", "white");
		
		// BEGIN main game tick
		update();
	}
	
	// Setup a new game
	function setupGame() {
		// reset variables
		score = 0;
		currentLevel = 0;
		currentGameState = GAME_STATE.IDLE;
		windowManager.deactivateUI("titleScreen");
		
		// prepare the level
		setupLevel();
		
		// create the player
		player = new Player();
		// attach a light source to the player
		lightSources.push(new LightSource(player, {r: 255, g: 255, b: 255}, 200, -1, false, false));
		
		// start music loop
		bgAudio.play();
	}
	
	// Setup the next level
	function setupLevel() {
		// increment level number
		++currentLevel;
		
		//== Load the level ==//
		loadLevel();
		windowManager.activateUI("controlsHUD");
		
		//== Reset entities ==//
		particles = [];
		particleSystems = [];
		projectiles = [];
		
		//== Starting Enemy ==//
		enemies[0] = new Enemy(ENEMY_TYPES.GATOR);
		
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
	
	// Load game assets (images and sounds)
	function loadAssets() {
		background.src = "assets/background.png";
		star.src = "assets/star.png";
		cloud.src = "assets/cloud.png";
		
		ENEMY_TYPES.RAT.img.src = "assets/ratRun.png";
		ENEMY_TYPES.BAT.img.src = "assets/batRun.png";
		ENEMY_TYPES.GATOR.img.src = "assets/gatorRun.png";
		
		PROJECTILE_TYPES.FIREBOLT.img.src = "assets/firebolt.png";
		PROJECTILE_TYPES.FIREGRENADE.img.src = "assets/firegrenade.png";
		PROJECTILE_TYPES.WATERBOLT.img.src = "assets/waterbolt.png";
		PROJECTILE_TYPES.WATERGRENADE.img.src = "assets/watergrenade.png";
		PROJECTILE_TYPES.EARTHBOLT.img.src = "assets/earthbolt.png";
		PROJECTILE_TYPES.EARTHGRENADE.img.src = "assets/earthgrenade.png";
		
		PARTICLE_TYPES.FLAME.img.src = PARTICLE_TYPES.FLAMEFOUNTAIN.img.src = "assets/flameParticle.png";
		PARTICLE_TYPES.WATERDRIP.img.src = PARTICLE_TYPES.WATERFOUNTAIN.img.src = "assets/dripParticle.png";
		PARTICLE_TYPES.EARTH.img.src = PARTICLE_TYPES.EARTHFOUNTAIN.img.src = "assets/earthParticle.png";
	}
	
	// play a sound effect
	function playStream(source, vol) {
		var audioPlayer = new Audio("assets/" + source);
		audioPlayer.volume = vol;
		audioPlayer.play();
	}
	
	// main game tick
	function update() {
		// scedule next draw frame and reset/calculate control variables
		animationID = requestAnimationFrame(update);
		postProcesses = [];
		dt = calculateDeltaTime();
		++time;
		
		// start game if on start screen and space or start is being pressed
		if (currentGameState === GAME_STATE.START) {
			windowManager.updateAndDraw({});
			return;
		}
		
		// draw high score screen
		if (currentGameState === GAME_STATE.HIGHSCORE) {
			ctx.fillStyle = "rgb(20, 20, 20)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "High Scores", canvas.width/2, 100, "30pt 'Uncial Antiqua'", "white");
			fillText(ctx, "Press H to return to the main menu", canvas.width/2, 135, "18pt Calibri", "white");
			
			// only draw high scores if localStorage is available
			if (typeof(window.localStorage) != undefined) {
				// loop through scores
				for (var i = 0; i < 10; ++i)
					// draw 0 in place of null scores
					if (highScores[i] == "null")
						fillText(ctx, (i+1) + ". 0", canvas.width/2, 200 + i*40, "20pt Calibri", "white");
					else
						fillText(ctx, (i+1) + ". " + highScores[i], canvas.width/2, 200 + i*40, "20pt Calibri", "white");
			}
			// otherwise, draw an error message
			else {
				fillText(ctx, "Your system does not support high score storage", canvas.width/2, canvas.height/2, "18pt Calibri", "white");
			}
			return;
		}
	 	
	 	// if paused, bail out of loop
		if (paused && inControl()) {
			return;
		}
		
		
		
		// == Main Draw ==//
		// clear the canvases
		offCtx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		
		
		//== Update & Draw All Objects ==//
		// All entities actually draw on the offsreen canvas in their draw function
		// We will then manipulate lighting on the offscreen canvas and move it to the onscreen
		
		// only actually update if player is in control or they're off the ground
		// we also update if they're off the ground so they don't freeze midair between levels
		if (inControl() || !players[i].onGround)
			player.update();
		// otherwise, just do the draw
		else
			player.draw();
		
		// if everyone is dead, send game to death screen
		if (player.health <= 0 && currentGameState != GAME_STATE.DEAD) {
			player = {}
			currentGameState = GAME_STATE.DEAD;
			
			// attempt to add the score to the high score list
			if (typeof(window.localStore) != undefined) {
				// loop through stored scores
				for (var i = 0; i < 10; ++i) {
					// get the stored score
					var value = window.localStorage.getItem("score"+i);
					
					// if no score is there yet, put this one there
					if (value === null) {
						window.localStorage.setItem("score"+i, score);
						return;
					}
					
					// if this score is higher than that one, put this one in and push the rest down
					if (score > value) {
						// push rest down
						for (var ii = 9; ii > i; --ii) {
							window.localStorage.setItem("score"+ii, window.localStorage.getItem("score"+(ii-1)));
						}
						// put this one here
						window.localStorage.setItem("score"+i, score);
						return;
					}
				}
			}
		}
		
		// add an enemy if there isn't one
		if (enemies.length < 5 && Math.random() < 0.015) {
			switch(Math.round(rand(0, 2.49))) {
				case 0: enemies.push(new Enemy(ENEMY_TYPES.GATOR));
					break;
				case 1: enemies.push(new Enemy(ENEMY_TYPES.RAT));
					break;
				default: enemies.push(new Enemy(ENEMY_TYPES.BAT));
					break;
			}
		}
		
		// update enemies
		for (var i = 0; i < enemies.length; ++i) {
			// only actually update enemies if player is in control
			if (inControl())
				enemies[i].update();
			// otherwise, just do the draw
			else
				enemies[i].draw();
		}
		
		// update projectiles
		for (var i = 0; i < projectiles.length; ++i) {
			projectiles[i].update();
		}
						
		// update runes
		for (var i = 0; i < runes.length; ++i) {
			runes[i].update();
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
		
		
		
		//== Manipulate canvas ==//
		// First, draw the untouched images onto the main canvas
		ctx.globalCompositeOperation = "source-over";
		ctx.drawImage(offCanvas, 0, 0);
		
		// Overlay everything with black
		ctx.fillStyle = "black";
		ctx.globalCompositeOperation = "source-atop";
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Next, loop through the lights and cut out the lit parts
		ctx.save();
			for (var i = 0; i < lightSources.length; ++i) {
				// get the current light source
				var l = lightSources[i];
				
				// create a radial gradient
				var radial = ctx.createRadialGradient(l.position.x, l.position.y, Math.max(l.radius, 0), l.position.x, l.position.y, 0);
				radial.addColorStop(0, "rgba(0, 0, 0, 0)");
				radial.addColorStop(1, l.color);
				ctx.fillStyle = radial;

				// subtract the light from the main canvas
				ctx.beginPath();
				ctx.arc(l.position.x, l.position.y, Math.max(l.radius, 0), 0, Math.PI*2, false);
				ctx.globalCompositeOperation = "destination-out";
				ctx.fill();
			}
		ctx.restore();
		
		// Finally, draw the lit parts onto the main canvas
		ctx.globalCompositeOperation = "destination-over";
		ctx.drawImage(offCanvas, 0, 0);
		
		
		
		//== Draw static environment ==//
		// These are drawn last, unmodified, below everything
		ctx.globalCompositeOperation = "destination-over";
		// terrain
		ctx.fillStyle = "black";
		ctx.fillRect(0, TERRAIN_HEIGHT, canvas.width, canvas.height - TERRAIN_HEIGHT);
		// background
		for (var i = 0; i < canvas.width; i += background.width)
			ctx.drawImage(background, i, 0);
		
		
		
		//== Draw postprocessed objects ==//
		// Objects can schedule their draw call in the postprocess array
		// These objects won't be affected by the main shading process
		ctx.globalCompositeOperation = "source-over";
		for (var i = 0;	i < postProcesses.length; ++i)
			postProcesses[i]();
		
		ctx.restore();
		
		
		
		//== Draw HUDs/interfaces ==//
		if (currentGameState != GAME_STATE.DEAD) {
			game.windowManager.updateAndDraw([]);
			
			/*
			// draw score in upper right
			var grad = ctx.createLinearGradient(0, 0, 150, 0);
			grad.addColorStop(0, "rgba(0, 0, 0, 0)");
			grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
			ctx.fillStyle = grad;
			ctx.fillRect(canvas.width-150, 0, 150, 50);
			fillText(ctx, "Score: " + score, canvas.width - 75, 25, "20pt Calibri", "white");
			ctx.fill();
			*/
		}
		// draw death screen if player has died
		else {
			ctx.save();
			ctx.fillStyle = "black";
			ctx.globalAlpha = 0.7;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fill();
			fillText(ctx, "You died.", canvas.width/2, canvas.height/2 - 40, "30pt 'Uncial Antiqua'", "white");
			fillText(ctx, "Score: " + score, canvas.width/2, canvas.height/2, "24pt Calibri", "white");
			fillText(ctx, "Press H to view high scores", canvas.width/2, canvas.height/2 + 40, "24pt Calibri", "white");
			fillText(ctx, "Press space to restart", canvas.width/2, canvas.height/2 + 80, "24pt Calibri", "white");
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
		
		// HELPER: returns whether this object overlaps another
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
	
	// CLASS: player object
	function Player(classType) {
		MobileObject.call(this);
	
		/* VARIABLES */
		this.image = new Image(); this.image.src = "assets/player.png";
		this.maxHealth = this.health = 100; // this player's health and max health
		this.velocity = new Victor(0, 0);		// player's velocity
		this.onGround = true;					// used for updating physics
		this.time = 0;							// used to control animation timing
		this.offset = new Victor(0, 7); 		// player's image offset
		this.spellType = "";					// the spell type of the player's current spell
		this.spellElement = "";					// the element of the player's current spell
		this.cooldown = 0;						// cooldown, determines whether a spell can be cast
		
		// set up image-dependent variables once the image loads
		this.image.onload = function() {
			this.frameWidth = this.image.width/28; 	// width of 1 frame from the spritesheet
			this.frameHeight = this.image.height;  	// height of 1 frame from the spritesheet
			this.bounds = new Victor(			// the player's bounding width and height
				this.image.width,
				this.image.height
			);
			this.position = new Victor(			// starting player position
				canvas.width/2,//(level.length*TERRAIN_WIDTH)/2 - this.bounds.x/2, 
				TERRAIN_HEIGHT - this.bounds.y
			);
		}.bind(this);
		
		// FUNCTION: prints player information to console
		this.toString = function() {
			console.log("Player is at " + this.position.toString());
		}
		
		// FUNCTION: damage the player, does appropriate armor checks, etc
		this.damage = function(power) {
			this.health -= power;
		}
		
		// FUNCTION: makes progress towards casting a spell
		this.cast = function(keycode) {
			// break out if the player is on cooldown
			if (this.cooldown > 0) return;
			
			//== Set spell property based on how far into spell cast they are
			// if spell type isn't set, set based on which key was pressed
			if (this.spellType === "") {
				switch (keycode) {
					// pressed 1 - bolt spell
					case KEY.ONE:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "bolt";
						break;
					// pressed 2 - rune spell
					case KEY.TWO:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "rune";
						break;
					// pressed 3 - grenade spell
					case KEY.THREE:
						windowManager.deactivateUI("controlsHUD");
						windowManager.activateUI("controlsHUD2");
						this.spellType = "grenade";
						break;
				}
			}
			else
			// if spell element isn't set, set based on which key was pressed
			if (this.spellElement === "") {
				switch (keycode) {
					// pressed 1 - fire spell
					case KEY.ONE:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "fire";
						break;
					// pressed 2 - water spell
					case KEY.TWO:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "water";
						break;
					// pressed 3 - earth spell
					case KEY.THREE:
						windowManager.deactivateUI("controlsHUD2");
						windowManager.activateUI("controlsHUD3");
						this.spellElement = "earth";
						break;
				}
			}
			
			// cast spell if both type and element are set and the function was told to cast the spell
			if (this.spellType != "" && this.spellElement != "" && keycode === "cast") {
				// variable to store type of spell
				var type = {};
					
				// cast right spell type
				switch (this.spellType) {
					// if it's a bolt
					case "bolt":
						// set type to right bolt element
						switch(this.spellElement) {
							case "fire":
								type = PROJECTILE_TYPES.FIREBOLT;
								break;
							case "water":
								type = PROJECTILE_TYPES.WATERBOLT;
								break;
							case "earth":
								type = PROJECTILE_TYPES.EARTHBOLT;
								break;
						}
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2 - type.width/2, this.position.y+this.bounds.y/2 - type.height/2, mouse, type, false));
						break;
					// if it's a rune
					case "rune":
						// set type to right rune element
						switch(this.spellElement) {
							case "fire":
								type = RUNE_TYPES.FIRE;
								break;
							case "water":
								type = RUNE_TYPES.WATER;
								break;
							case "earth":
								type = RUNE_TYPES.EARTH;
								break;
						}
						runes.push(new Rune(type));
						break;
					// if it's a grenade
					case "grenade":
						// set type to right grenade element
						switch(this.spellElement) {
							case "fire":
								type = PROJECTILE_TYPES.FIREGRENADE;
								break;
							case "water":
								type = PROJECTILE_TYPES.WATERGRENADE;
								break;
							case "earth":
								type = PROJECTILE_TYPES.EARTHGRENADE;
								break;
						}
						projectiles.push(new Projectile(this.position.x+this.bounds.x/2 - type.width/2, this.position.y+this.bounds.y/2 - type.height/2, mouse, type, false));
						break;
				}
				
				windowManager.deactivateUI("controlsHUD3");
				windowManager.activateUI("controlsHUD");
				//this.cooldown = type.cooldown;
				this.spellType = "";
				this.spellElement = "";
			}
		}
		
		// FUNCTION: main player object tick
		this.update = function() {
			// clamp health within 0 and max
			this.health = clamp(this.health, 0, this.maxHealth);
			
			// movement controls
			if (keys[KEY.A] && this.onGround)
				this.velocity.x -= 0.6;
			if (keys[KEY.D] && this.onGround)
				this.velocity.x += 0.6;
				
			// update the player's physics
			this.updatePhysics.call(this);
			
			// lock on screen
			this.position.x = clamp(this.position.x, 0, canvas.width - this.bounds.x);
			
			// updates for spell casting
			if (this.cooldown > 0) --this.cooldown;
				
			// DRAW: draw the player
			this.draw();
		}
		
		// FUNCTION: main player draw call
		this.draw = function() {
			// increment timing for animation
			this.time = (this.time+0.75) % 28;
					
			offCtx.save();
			// draw the player's actual image from its spritesheet
			//offCtx.drawImage(this.image, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, this.position.x + this.offset.x, this.position.y + this.offset.y, this.frameWidth, this.frameHeight);
			offCtx.translate(this.position.x + this.image.width/2, this.position.y + this.image.height/2);
			offCtx.scale(this.xScale, 1);
			offCtx.drawImage(this.image, -this.image.width/2 + this.offset.x, -this.image.height/2 + this.offset.y);
				
			// draw health above head
			//offCtx.fillStyle = "red";
			//offCtx.fillRect(this.position.x+10, this.position.y - 14, this.bounds.x-20, 5);
			//offCtx.fillStyle = "green";
			//offCtx.fillRect(this.position.x+10, this.position.y - 14, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
			
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
		this.time = 0;
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
			
		// attach a light source and particle system based on the types declared in the projectile enum
		this.system = new ParticleSystem(this, this.projType.particle, -1, this.projType.particleLifetime, this.projType.particlesPerFrame);
		this.light = new LightSource(this, this.projType.color, this.projType.width*4, -1, true, true);
		particleSystems.push(this.system);
		lightSources.push(this.light);
		
		// FUNCTION: gives a generalized string that portrays its projectile type
		this.type = function() {
			if (this.projType === PROJECTILE_TYPES.FIREBOLT || this.projType === PROJECTILE_TYPES.WATERBOLT || this.projType === PROJECTILE_TYPES.EARTHBOLT)
				return "bolt";
			if (this.projType === PROJECTILE_TYPES.FIREGRENADE || this.projType === PROJECTILE_TYPES.WATERGRENADE || this.projType === PROJECTILE_TYPES.EARTHGRENADE)
				return "grenade";
		}
	
		// FUNCTION: gives a generalized string that portrays its element
		this.element = function() {
			if (this.projType === PROJECTILE_TYPES.FIREBOLT || this.projType === PROJECTILE_TYPES.FIREGRENADE)
				return "fire";
			if (this.projType === PROJECTILE_TYPES.WATERBOLT || this.projType === PROJECTILE_TYPES.WATERGRENADE)
				return "water";
			if (this.projType === PROJECTILE_TYPES.EARTHBOLT || this.projType === PROJECTILE_TYPES.EARTHGRENADE)
				return "earth";
		}
		
		// FUNCTION: main projectile object tick
		this.update = function() {	
			// handle hitting terrain
			if (this.position.y + this.bounds.y > TERRAIN_HEIGHT) {
				// for bolts, they just explode (disappear)
				if (this.type() === "bolt") {
					// create a quick 'particle burst'
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
			
			// update the projectile's physics
			this.updatePhysics.call(this);
			
			// whether the projectile has collided with something
			var victim = "" // stores who/what the projectile hit
			
			// explode once it's finished its 3rd bounce
			if (this.numBounces >= 3)
				victim = this;
				
			// check player collisions if it's an enemy projectile
			if (this.enemyProj && this.overlaps(player)) {
				victim = p;
			}
			
			// loop through enemies if it's a non-enemy projectile
			if (!this.enemyProj)
				for (var i = 0; i < enemies.length; ++i) {
					// get currently looped terrain object
					var e = enemies[i];
					
					// update onGround variable by comparing pos to each terrain object
					if (this.overlaps(e)) {
						victim = e;
						break;
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
					
					// if this projectile is fire based, ignite the enemy and give
					// them a flame particle system if it's not already on fire
					if (this.element() === "fire") {
						if (victim.fireTicks <= 0)
							particleSystems.push(new ParticleSystem(victim, PARTICLE_TYPES.FLAME, 60, 30, 2));
						victim.fireTicks = 60;
					}
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
										particleSystems.push(new ParticleSystem(enemy, PARTICLE_TYPES.FLAME, 60 * scalar, 30, 2));
									enemy.fireTicks = 60 * scalar;
								}
							}
						}
					}
				}
				
				// create a quick 'particle burst' as if the projectile shattered
				particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: this.bounds.clone()}, this.projType.particle, 1, this.projType.particleLifetime, Math.min(Math.max(0.5, this.projType.particlesPerFrame)*20, 40)));
				// delete this one
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				projectiles.safeSplice(projectiles.indexOf(this), 1);
				// begin the light source's death
				this.light.root = "dying";
				return;
			}
				
			// DRAW: draw the projectile
			this.draw();
		}
	
		// FUCNTION: main projectile draw call
		this.draw = function() {
			// draw increments based on y speed
			this.time += this.velocity.clone().norm().x/7;//0.1*(this.velocity.x == 0 ? 1 : Math.sign(this.velocity.x));//
			
			offCtx.save();
			offCtx.translate(this.position.x + this.bounds.x/2, this.position.y + this.bounds.y/2);
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
		this.position = new Victor(mouse.position.x - this.runeType.width/2, TERRAIN_HEIGHT);
		this.light = {};
		this.system = {};
		
		// create particle system and light based on rune type
		//this.system = new ParticleSystem(this, this.projType.particle, -1, this.projType.particleLifetime, this.projType.particlesPerFrame);
		this.light = new LightSource(this, this.runeType.color, this.runeType.width, -1, false, false);
		//particleSystems.push(this.system);
		lightSources.push(this.light);
		
		// Update - checks if enemies have triggered the rune
		this.update = function() {
			// variable to store whether an enemy/enemies triggered the rune
			var triggered = false;
			
			// loop enemies
			for (var i = 0; i < enemies.length; ++i) {
				// get current one
				var e = enemies[i];
				
				// check if enemy is above rune's center and is on the ground
				if (e.position.x + e.bounds.x > this.position.x && e.position.x < this.position.x && e.onGround) {
					triggered = true;
				
					// damage and knock up the enemy
					e.damage(this.runeType.strength);
					e.velocity.y = -this.runeType.strength/2;
					--e.position.y;
					
					// create a quick 'particle burst'
					particleSystems.push(new ParticleSystem({position: this.position.clone(), bounds: new Victor()}, this.runeType.particle, 1, this.runeType.particleLifetime, Math.min(Math.max(0.5, this.runeType.particlesPerFrame)*20, 40)));
				}
			}
					
			// if the rune was triggered, remove this rune, its particle system, and its light source from the global lists
			if (triggered) {
				runes.safeSplice(runes.indexOf(this), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				particleSystems.safeSplice(particleSystems.indexOf(this.system), 1);
				return;
			}
			
			// draw the rune as a postprocess
			postProcesses.push(this.draw.bind(this));
		}
		
		// Draw
		// Called as a postprocesses
		this.draw = function() {			
			// draw a ring on the ground
			ctx.save();
				var grad = ctx.createLinearGradient(this.position.x, this.position.y - this.runeType.width, this.position.x, this.position.y);
				grad.addColorStop(0, colorString(this.runeType.color, 0));
				grad.addColorStop(1, colorString(this.runeType.color, 0.5));
				ctx.fillStyle = grad;
				ctx.fillRect(this.position.x - this.runeType.width/2, this.position.y - this.runeType.width, this.runeType.width, this.runeType.width);
				
				ctx.translate(this.position.x, this.position.y);
				ctx.scale(1, 0.05)
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
			canvas.width + this.frameWidth,
			TERRAIN_HEIGHT - this.bounds.y*1.5
		);
		
		// flying enemies spawn at the top of the screen
		if (this.enemyType.AI === "flying")
			this.position.y = 0;
		
		// some spawn on left of screen instead
		if (Math.random() < 0.5) this.position.x = -this.frameWidth*2;
		
		// FUNCTION: main enemy object tick
		this.update = function() {
			// check if enemy is dead
			if (this.health <= 0) {
				// award points equal to its starting health
				score += this.enemyType.health;
				
				// delete this one
				enemies.safeSplice(enemies.indexOf(this), 1);
				return;
			}
			
			// always move towards the player's other side
			this.targetPos = player.position.clone();
			this.targetPos.x += player.bounds.x/4 * this.xScale;
			
			// bobbing for flying enemies, and target above the player
			if (this.enemyType.AI === "flying") {
				this.position.y += Math.sin(time/10);
				this.targetPos.y -= this.bounds.y*2;
			}
				
			// lose health from active DOTs
			if (this.fireTicks > 0) {
				--this.fireTicks;
				this.health -= 0.05;
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
			
			// DRAW: draw the enemy
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
				offCtx.translate(this.position.x + this.bounds.x/2, this.position.y + this.bounds.y/2);
				offCtx.scale(this.xScale, 1);
				offCtx.drawImage(this.enemyType.img, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, (-this.bounds.x/2 + this.offset.x), -this.bounds.y/2 + this.offset.y, this.frameWidth, this.frameHeight);
				offCtx.restore();
				
			// draw health above head
			offCtx.fillStyle = "red";
			offCtx.fillRect(this.position.x+10, this.position.y - 10, this.bounds.x-20, 5);
			offCtx.fillStyle = "green";
			offCtx.fillRect(this.position.x+10, this.position.y - 10, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
			offCtx.fill();
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
		switch (this.particleType) {
			case PARTICLE_TYPES.FLAME:
				this.light = new LightSource(this, globalFire(), 12, -1, false, true);
				lightSources.push(this.light);
				break;
			case PARTICLE_TYPES.EARTH:
				this.light = new LightSource(this, globalEarth(), 12, -1, true, true);
				lightSources.push(this.light);
				break;
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
				 this.position.x < 0 || this.position.x > canvas.width || this.position.y < 0 || this.position.y > canvas.height) {
				particles.safeSplice(particles.indexOf(this), 1);
				lightSources.safeSplice(lightSources.indexOf(this.light), 1);
				return;
			}
			
			// Draw particle as a post-process (disobeys lighting)
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
				ctx.drawImage(this.particleType.img, this.position.x, this.position.y);
		}
	}
 
	// CLASS: particle system
	function LightSource(root, color, radius, lifetime, flicker, visible) {
		// assign starting variables
		this.visible = visible;					// whether or not to actually draw the light; false makes an "anit-fog of war" (visibility vs. light)
		this.root = root;						// the object this is linked to
		this.position = this.root.position;		// light's position
		this.radius = radius;					// outer radius of the light
		// the color of the source's light, passed as rgb object literal for use in draw call
		this.color = "rgb(" + color.r + "," + color.g + "," + color.b + ")";
		
		// Update light source system
		this.update = function() {
			// delete this if its root is gone or it's too small to draw
			if (this.root == undefined || this.radius < 1) {
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
				this.position = this.root.position.clone().add(this.root.bounds.clone().divide(Victor(2, 2)));
				
				// flicker radius if flicker is enabled
				if (flicker)
					this.radius = radius * rand(0.9, 1.1);
				
				// increment time lived
				++this.time;
				// delete this system if its time lived has surpassed its lifetime
				if (this.time > lifetime && lifetime > 0) {
					lightSources.safeSplice(lightSources.indexOf(this), 1);
				}
			}
			
			// Draw call: set light to be drawn as a postprocess
			// particles don't draw an actual colored glow for performance reasons
			if (!(this.root instanceof Particle) && visible)
				postProcesses.push(this.draw.bind(this));
		}
		
		//== Draw the light source
		// This is only ever called as a post-process
		this.draw = function() {
			// draw the light on the canvas
			// create a radial gradient
			var radial = ctx.createRadialGradient(this.position.x, this.position.y, Math.max(this.radius, 0), this.position.x, this.position.y, 0);
			radial.addColorStop(0.3, "rgba(" + color.r + "," + color.g + "," + color.b + ", 0)");
			radial.addColorStop(1, "rgba(" + color.r + "," + color.g + "," + color.b + ", 0.5)");
			ctx.fillStyle = radial;
			
			ctx.beginPath();
			ctx.arc(this.position.x, this.position.y, Math.max(this.radius, 0), 0, Math.PI*2, false);
			ctx.globalCompositeOperation = "lighter";
			ctx.fill();
		}
	}
	
	// PAUSE FUNCTION: pauses the game
	function pauseGame() {
		// since pause can be called multiple ways
		// prevents multiple redraws of pause screen
		if (!paused) {
			paused = true;
			bgAudio.pause();
			
			// stop the animation loop if the player is alive
			if (currentGameState == GAME_STATE.RUNNING)
				cancelAnimationFrame(animationID);
			
			// draw the pause screen
			ctx.save();
			ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			fillText(ctx, "Paused", canvas.width/2, canvas.height/2, "30pt Calibri", "white");
			fillText(ctx, "Press P to unpause", canvas.width/2, canvas.height/2+40, "24pt Calibri", "white");
			ctx.restore();
		}
	}
	
	// RESUME FUNCTION: resumes the game
	function resumeGame() {
		paused = false;
		bgAudio.play();
		
		// forcibly end animation loop in case it's running
		// only end the loop if the player is alive
		if (currentGameState == GAME_STATE.RUNNING) {
			cancelAnimationFrame(animationID);
			// resume ticking
			update();
		}
	}
	
	// FUNCTION: do things based on key presses
	function keyPress(e) {
		// initialize value at keycode to false on first press
		if (keys[e.keyCode] === undefined)
			keys[e.keyCode] = false;
		
		// send it to the player if they're not casting already
		if (player.cooldown <= 0)
			player.cast(e.keyCode);
		else
			console.log("Player can't cast");
		
		// spacebar - jump!
		if (e.keyCode === KEY.SPACE) {
			player.jump(8, 1);
			
			// prevent spacebar page scrolling
			e.preventDefault();
		}

		// p - toggle game paused
		if (e.keyCode === KEY.P) {
			// check if paused, and toggle it
			if (paused)
				resumeGame();
			else
				pauseGame();
		}
		
		// h - view high scores if on main or death screen
		if (e.keyCode === KEY.H) {
			// return to home screen after viewing high scores
			if (currentGameState === GAME_STATE.HIGHSCORE) {
				currentGameState = GAME_STATE.START;
			}
			else
			if (currentGameState === GAME_STATE.DEAD || currentGameState === GAME_STATE.START) {
				currentGameState = GAME_STATE.HIGHSCORE;
				
				// load in the scores from local storage
				highScores = [];
				for (var i = 0; i < 10; ++i) {
					if (typeof(window.localStorage) != undefined) {
						highScores[i] = window.localStorage.getItem("score"+i);
					}
				}
			}
		}
		
		// set the keycode to true
		// we do this last so we can check if this is the first tick it's pressed
		keys[e.keyCode] = true;
	}
	
	// FUNCTION: do things based on key releases
	function keyRelease(e) {
		keys[e.keyCode] = false;
		// spacebar - jump!
		if (e.keyCode == KEY.SPACE) {
			// prevent spacebar page scrolling
			e.preventDefault();
			 
			// if the player has died, restart the game
			if (currentGameState === GAME_STATE.DEAD) {
				currentGameState = GAME_STATE.START;
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