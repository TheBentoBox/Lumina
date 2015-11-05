// engine.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {}

game.engine = (function(){
	console.log("loaded engine.js module");
	
	/* VARIABLES */
	// SCREEN AND AUDIO VARIABLES
	var windowManager = game.windowManager; // reference to the engine's window manager
	var bgAudio;				// audio player reference for background audio
	var sfxPlayer;				// audio player reference for sound effects
	var canvas,ctx;				// canvas references
	var mouseX, mouseY;			// mouse coordinates
	var animationID;			// stores animation ID of animation frame
	var paused = false;			// if the game is paused
	var mouseDown = false;		// if the mouse is being held down
	var uiClicked = false;		// if UI was clicked
	var mouse = {}				// the mouse object
	var lastTime = (+new Date); // used with calculateDeltaTime
	var dt = 0;					// delta time
	var time = 0;
	
	// ASSETS
	var background = new Image();
	var cloud = new Image();
	var star = new Image();
	
	// GAME VARIABLES
	// General
	var GAME_STATE = {			// "enum" of the current status of the game
		START: 0,				// start screen
		IDLE: 1,				// level is sitting idly
		CASTING: 2,				// player is in the process of building a spell
		ATTACKING: 3,			// a spell is being executed
		BETWEEN: 4,				// between level upgrade
		DEAD: 5,				// game over screen
		HIGHSCORE: 6			// viewing the high score table
	}
	var currentGameState = GAME_STATE.START; // what is currently happening in the game
	var currentLevel = 0;		// what level the player is on
	var keys = [];				// array to store pressed keys
	var experience = 0;			// increases like score, but can be spent for upgrades
	var score = 0;				// current score, = number of terrain objects passed
	var highScores = [];		// array of high scores when they're loaded in
	
	// Player
	var player = {}			// the player object
	// Level
	var TERRAIN_WIDTH = 100;	// width of a terrain tile
	var TERRAIN_HEIGHT = 0; 	// height of terrain from the bottom of the screen
	var level = [];				// array storing the map of the current level
	var screenX = 0;			// current horizontal position of camera in level
	// Enemies
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
	// Projectiles
	var projectiles = [];
	var PROJECTILE_TYPES = {
		ARROW: {
			strength: function() { return 3 + ranger.abilities.Q.level; },
			img: new Image(),
			width: 45,
			height: 13,
			gravity: true,
			velocity: 2
		},
		FIREBALL: {
			strength: function() { return Math.min(8, 1 + currentLevel); },
			img: new Image(),
			width: 40,
			height: 40,
			gravity: false,
			velocity: -30
		}
	}
	// Particle Systems
	var particleSystems = [];
	var particles = [];
	var PARTICLE_TYPES = {		// enum storing particle type info
		FLAME: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(rand(-1, 1), rand(-1, 1)); },
			img: new Image()
		},
		ICE: {
			collidesTerrain: true,
			gravity: true,
			vel: function() { return new Victor(rand(10, 30), rand(-10, -30)); },
			img: new Image()
		},
		FROST: {
			collidesTerrain: false,
			gravity: false,
			vel: function() { return new Victor(-globalGameSpeed + rand(-0.5, 0.5), rand(-0.5, 0.5)); },
			img: new Image()
		}
	}
	
	// PHYSICS VARIABLES
	var GRAVITY = 60;			// global gravity - this*dt added to velocity.y
	var inControl = function() { return currentGameState === GAME_STATE.IDLE || currentGameState === GAME_STATE.CASTING; }
	
	
	// Set up canvas and game variables
	function init() {
		// SETUP: canvas and audio
		// canvas
		canvas = document.querySelector('canvas');
		ctx = canvas.getContext("2d");
		TERRAIN_HEIGHT = canvas.height - 150; // set terrain height now that canvas is loaded
		
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
		// title
		windowManager.makeText("titleScreen", "title", 50, 50, "default", "default", "Lumina", "40pt 'Uncial Antiqua'", "rgb(250, 255, 195)");
		windowManager.toggleText("titleScreen", "title");
		windowManager.toggleButton("titleScreen", "startButton");
		windowManager.toggleUI("titleScreen");
		
		// BEGIN main game tick
		update();
	}
	
	// Setup a new game
	function setupGame() {
		// reset variables
		score = 0;
		currentLevel = 0;
		currentGameState = GAME_STATE.IDLE;
		windowManager.deactivate("titleScreen");
		
		// prepare the level
		setupLevel();
		
		// create the player
		player = new Player();
		
		// start music loop
		bgAudio.play();
	}
	
	// Setup the next level
	function setupLevel() {
		// increment level number
		++currentLevel;
		
		//== Load the level ==//
		loadLevel();
		
		//== Reset entities ==//
		particles = [];
		particleSystems = [];
		projectiles = [];
		
		//== Starting Enemy ==//
		//enemies[0] = new Enemy(ENEMY_TYPES.GATOR);
		
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
		
		PROJECTILE_TYPES.ARROW.img.src = "assets/arrow.png";
		PROJECTILE_TYPES.FIREBALL.img.src = "assets/fireball.png";
		
		PARTICLE_TYPES.FLAME.img.src = "assets/flameParticle.png";
		PARTICLE_TYPES.ICE.img.src = PARTICLE_TYPES.FROST.img.src = "assets/iceParticle.png";
	}
	
	// play a sound effect
	function playStream(source, vol) {
		var player = new Audio("assets/" + source);
		player.volume = vol;
		player.play();
	}
	
	// main game tick
	function update() {
		// scedule next draw frame
		animationID = requestAnimationFrame(update);
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
		if (paused && currentGameState === GAME_STATE.RUNNING) {
			return;
		}
		
		// clear the screen
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		// draw the parallax background
		for (var i = 0; i < canvas.width; i += background.width) {
			ctx.drawImage(background, i, 0);
		}
		
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
		/*
		if (enemies.length === 0) {
			switch(Math.round(rand(0, 2))) {
				case 0: enemies.push(new Enemy(ENEMY_TYPES.GATOR));
					break;
				case 1: enemies.push(new Enemy(ENEMY_TYPES.RAT));
					break;
				default: enemies.push(new Enemy(ENEMY_TYPES.BAT));
					break;
			}
		}
		*/
		
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
						
		// update particle systems
		for (var i = 0; i < particleSystems.length; ++i)
			particleSystems[i].update();
		// update all particles
		for (var i = 0; i < particles.length; ++i)
			particles[i].update();
			
		// draw terrains
		ctx.save();
		ctx.fillStyle = "black";
		ctx.fillRect(0, TERRAIN_HEIGHT, canvas.width, TERRAIN_HEIGHT);
		
		/*
		ctx.beginPath();
		
		var startX = Math.max(0, Math.floor(screenX/TERRAIN_WIDTH) - 2);
		var endX = Math.min(level.length-1, Math.floor((screenX+canvas.width)/TERRAIN_WIDTH) + 2);
		//var drawX  = -(screenX % TERRAIN_WIDTH);
		//ctx.moveTo(drawX, canvas.height - 100 - level[startX]*20);
		//++startX; drawX += TERRAIN_WIDTH;
		var moved = false;
		
		for (var i = 0; i < level.length - 2; ++i) {
			if (i >= startX && i <= endX) {
				var drawX = -screenX + i * TERRAIN_WIDTH;
				
				if (!moved) {
					ctx.moveTo(drawX, canvas.height - 100 - level[i]*20);
					moved = true
				}
				ctx.quadraticCurveTo(drawX + TERRAIN_WIDTH, canvas.height - 100 - level[i+1]*20, drawX + TERRAIN_WIDTH*2, canvas.height - 100 - level[i+2]*20);
			}
			
			++i;
		}
		
		ctx.lineTo(canvas.width, canvas.height);
		ctx.lineTo(0, canvas.height);
		ctx.closePath();
		ctx.fill();
		*/
		
		ctx.restore();
		
		// draw HUDs
		if (currentGameState != GAME_STATE.DEAD) {
			game.windowManager.updateAndDraw([]);
		
			// draw score in upper right
			var grad = ctx.createLinearGradient(0, 0, 150, 0);
			grad.addColorStop(0, "rgba(0, 0, 0, 0)");
			grad.addColorStop(1, "rgba(0, 0, 0, 0.5)");
			ctx.fillStyle = grad;
			ctx.fillRect(canvas.width-150, 0, 150, 50);
			fillText(ctx, "Score: " + score, canvas.width - 75, 25, "20pt Calibri", "white");
			ctx.fill();
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
			if (!this.onGround)
				this.velocity.y += GRAVITY * dt;
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
			if (this.position.y + this.bounds.y > TERRAIN_HEIGHT)
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
		
		// FUNCTION: main player object tick
		this.update = function() {
			// clamp health within 0 and max
			this.health = clamp(this.health, 0, this.maxHealth);
				
			// update the player's physics
			this.updatePhysics.call(this);
			
			// movement contraols
			if (keys[KEY.A] && this.onGround)
				this.velocity.x -= 0.6;
			if (keys[KEY.D] && this.onGround)
				this.velocity.x += 0.6;
				
			// DRAW: draw the player
			this.draw();
		}
		
		// FUNCTION: main player draw call
		this.draw = function() {
			// increment timing for animation
			this.time = (this.time+0.75) % 28;
					
			ctx.save();
			// draw the player's actual image from its spritesheet
			//ctx.drawImage(this.image, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, this.position.x + this.offset.x, this.position.y + this.offset.y, this.frameWidth, this.frameHeight);
			ctx.translate(this.position.x + this.image.width/2, this.position.y + this.image.height/2);
			ctx.scale(this.xScale, 1);
			ctx.drawImage(this.image, -this.image.width/2 + this.offset.x, -this.image.height/2 + this.offset.y);
				
			// draw health above head
			//ctx.fillStyle = "red";
			//ctx.fillRect(this.position.x+10, this.position.y - 14, this.bounds.x-20, 5);
			//ctx.fillStyle = "green";
			//ctx.fillRect(this.position.x+10, this.position.y - 14, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
			
			ctx.restore();
		}
	}
 
	// CLASS: projectile
	function Projectile(x, y, towards, projType, enemy) {
		MobileObject.call(this);
		
		// type of projectile
		this.projType = projType;
		this.enemyProj = enemy; // whether an enemy fired it (only hits players)
		this.speed = 30 - this.projType.velocity;
		this.gravity = this.projType.gravity;
		// the projectile's bounding box
		this.bounds = new Victor(
			this.projType.width,
			this.projType.height
		);
		// starting projectile position
		this.position = new Victor(
			x,
			y
		);
		// starting projectile velocity
		// directs itself towards the "towards" object passed in
		if (towards != undefined)
			if (towards.position != undefined)
				this.velocity = this.vecToOther(towards).divide(Victor(this.speed, this.speed));
			else
				this.velocity = Victor().subtract(this.position);
		else
			this.velocity = Victor().subtract(this.position);
			
		// attach a particle system based on its projectile type
		switch (this.projType) {
			case PROJECTILE_TYPES.FIREBALL:
				this.system = new ParticleSystem(this, PARTICLE_TYPES.FLAME, -1, 10, 5);
				particleSystems.push(this.system);
				break;
		}
		
		// give an upwards thrust if it's affected by gravity
		if (this.gravity)
			this.velocity.y -= 15;
		
		// FUNCTION: main projectile object tick
		this.update = function() {		
			// kill player if off screen
			if (this.position.y > canvas.height*2 || this.position.x < 0 || this.position.x > canvas.width) {
				// delete this one
				projectiles.splice(projectiles.indexOf(this), 1);
				particleSystems.splice(particleSystems.indexOf(this.system), 1);
				return;
			}
			
			// whether the projectile has collided with something
			var collided = false;
			var victim = {} // stores who/what the projectile hit
				
			// check player collisions if it's an enemy projectile
			if (this.enemyProj && this.overlaps(player)) {
				collided = true;
				victim = p;
			}
			
			// update the projectile's physics
			this.updatePhysics.call(this);
			
			// loop through enemies if it's a non-enemy projectile
			if (!this.enemyProj)
			for (var i = 0; i < enemies.length; ++i) {
				// get currently looped terrain object
				var e = enemies[i];
				
				// update onGround variable by comparing pos to each terrain object
				if (this.overlaps(e)) {
					collided = true;
					victim = e;
					break;
				}
			}
			
			else {
				// damage the victim and give it a flame particle system
				victim.damage(this.projType.strength());
				particleSystems.push(new ParticleSystem(victim, PARTICLE_TYPES.FLAME, 60, 30, 5));
			
				// if this is a magi fireball, ignite the enemy
				if (this.projType === PROJECTILE_TYPES.MAGIFIREBALL)
					victim.fireTicks = 60;
			
				// delete this one
				particleSystems.splice(particleSystems.indexOf(this.system), 1);
				projectiles.splice(projectiles.indexOf(this), 1);
			}
				
			// DRAW: draw the projectile
			this.draw();
		}
	
		// FUCNTION: main projectile draw call
		this.draw = function() {
			ctx.save();
			ctx.drawImage(this.projType.img, this.position.x, this.position.y);
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
		this.bounds = new Victor(
			this.enemyType.width,
			this.enemyType.height
		);
		this.position = new Victor(		// starting enemy position
			canvas.width + this.bounds.x*1.5,
			canvas.height-this.bounds.y*2
		);
		this.frameWidth = this.enemyType.img.width/28; // width of 1 frame from the spritesheet
		this.frameHeight = this.enemyType.img.height;  // height of 1 frame from the spritesheet
		this.offset = new Victor(this.frameWidth/-4, this.frameHeight/-4); // enemys's image offset
		
		// set target differently depending on AI
		switch (this.enemyType.AI) {
			// if they're flying, they home to the top right
			case "flying":
				this.targetPos = new Victor(	// the location the enemy is homing towards
					canvas.width - this.bounds.x*1.5,
					this.bounds.y*1.5
				);
				break;
			// if it's a running enemy, they home to the right side
			default:
				this.targetPos = new Victor(	// the location the enemy is homing towards
					canvas.width - this.bounds.x*1.5,
					canvas.height-this.bounds.y
				);
				break;
		}
		
		// FUNCTION: prints enemy information to console
		this.toString = function() {
			console.log("Enemy " + this.enemyType + " is at x" + this.position.toString());
		}
		
		// FUNCTION: main enemy object tick
		this.update = function() {					
			// kill enemy if off screen or dead
			if (this.position.y > canvas.height*2 || this.health <= 0) {
				// award points equal to its starting health
				score += this.enemyType.health;
				
				// delete this one
				enemies.splice(enemies.indexOf(this), 1);
			}
			
			// bobbing for flying enemies
			if (this.enemyType.AI === "flying")
				this.position.y += Math.sin(time/10);
				
			// lose health from active DOTs
			if (this.fireTicks > 0) {
				--this.fireTicks;
				this.health -= 0.05;
			}
			
			// home towards target position
			if (this.targetPos != undefined) {
				// if it's close, snap to its homing position
				if (this.position.distanceSq(this.targetPos) <= 9) {
					this.position = this.targetPos;
					this.targetPos = undefined;
					this.velocity = new Victor();
				}
				// otherwise, velocity homes towards its target
				else {
					// if it's a flying enemy, it uses true homing
					if (this.enemyType.AI === "flying")
						this.velocity = this.targetPos.clone().subtract(this.position).divide(new Victor(20, 20));
					// otherwise, only set x velocity
					else
						this.velocity.x = this.targetPos.clone().subtract(this.position).divide(new Victor(20, 20)).x;
				}
			}
			
			// loop through velocity
			for (var i = 0; i < this.velocity.length(); ++i) {	
				// distance we'll move along each axis this loop
				var moveDistX = 0; var moveDistY = 0;
				// move distance is 1, or the decimal remainder of velocity on the last loop
				// only actually update the moveDist if it would be > 0
				if (Math.abs(this.velocity.x) - i > 0)
					moveDistX = (Math.abs(this.velocity.x) - i < 1 ? Math.abs(this.velocity.x) - i : 1) * Math.sign(this.velocity.x);
				// only do vertical target tracking if they're a flying enemy
				if (Math.abs(this.velocity.y) - i > 0)
					moveDistY = (Math.abs(this.velocity.y) - i < 1 ? Math.abs(this.velocity.y) - i : 1) * Math.sign(this.velocity.y);
				
				// variable to store if its safe to move
				var positionSafe = true;
				
				// if we're safe to move, shift down
				if (positionSafe || (this.position.y + this.bounds.y > currentTerrain.position.y && this.enemyType.AI != "flying")) {
					this.position.x += moveDistX;
					this.position.y += moveDistY;
					//console.log(this.position + ", " + this.onGround + ", " + this.velocity.toString());
				}
				// otherwise, stick to the terrain
				else {
					this.velocity.y = 0;
					this.position.y = canvas.height - this.bounds.y;
					this.numJumps = 0;
					this.onGround = true;
					break;
				}
			}
			
			// if it's on the ground, forcibly ground it
			if (this.onGround) {
				this.velocity.y = 0;
				this.position.y = canvas.height - this.bounds.y;
				this.numJumps = 0;
			}
				
			// DRAW: draw the enemy
			this.draw();
		}
	
		// FUCNTION: main enemy draw call
		this.draw = function() {
			// increment timing for animation
			this.time = (this.time+0.75) % 28;
					
			ctx.save();
			// rats have completed art, so draw their sprite from their sheet
			ctx.drawImage(this.enemyType.img, this.frameWidth*Math.floor(this.time), 0, this.frameWidth, this.frameHeight, this.position.x + this.offset.x, this.position.y + this.offset.y, this.frameWidth, this.frameHeight);
			
			// draw health above head
			ctx.fillStyle = "red";
			ctx.fillRect(this.position.x+10, this.position.y - 10, this.bounds.x-20, 5);
			ctx.fillStyle = "green";
			ctx.fillRect(this.position.x+10, this.position.y - 10, (this.bounds.x-20) * (this.health/this.maxHealth), 5);
			ctx.fill();
			ctx.restore();
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
			// delete this if its root is gone
			if (this.root == undefined) {
				particleSystems.splice(particleSystems.indexOf(this), 1);
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
				particleSystems.splice(particleSystems.indexOf(this), 1);
			}
		}
	}
	
	// CLASS: particle
	function Particle(parent, particleType, lifetime) {
		// inherits from MobileGameObject
		MobileObject.call(this);
	
		// assign starting variables
		this.parent = parent;
		this.particleType = particleType;	// what type of particle this is
		this.deathtime = 0; 				// used to kill particles if they don't die naturally
		this.lifetime = lifetime;
		this.position = new Victor(parent.root.position.x + parent.root.bounds.x/10 + Math.random()*parent.root.bounds.x*0.8, parent.root.position.y + parent.root.bounds.y/10 + Math.random()*parent.root.bounds.y*0.8);
		this.velocity = this.particleType.vel.call(this);
		this.bounds = new Victor(3, 3);
		this.time = 0;
		
		// update particle
		this.update = function() {
			// affected by gravity based on particle type
			if (this.particleType.gravity)
				this.velocity.y += GRAVITY*dt;
		
			// if particle type collides with terrain, do pixel collisions
			if (this.particleType.collidesTerrain) {
				// loop through velocity
				for (var i = 0; i < this.velocity.length(); ++i) {	
				// distance we'll move along each axis this loop
				var moveDistX = 0; var moveDistY = 0;
				// move distance is 1, or the decimal remainder of velocity on the last loop
				// only actually update the moveDist if it would be > 0
				if (Math.abs(this.velocity.x) - i > 0)
					moveDistX = (Math.abs(this.velocity.x) - i < 1 ? Math.abs(this.velocity.x) - i : 1) * Math.sign(this.velocity.x);
				// only do vertical target tracking if they're a flying enemy
				if (Math.abs(this.velocity.y) - i > 0)
					moveDistY = (Math.abs(this.velocity.y) - i < 1 ? Math.abs(this.velocity.y) - i : 1) * Math.sign(this.velocity.y);
				
				// variable to store if its safe to move
				var positionSafe = true;
				
				// loop through terrain objects and check if we can move down
				for (var ii = 0; ii < terrains.length; ++ii) {
					// get currently looped terrain object
					var currentTerrain = terrains[ii];
					
					// check is position we'd move to is safe (above terrain)
					// terrain we're checking is below is
					if (this.position.x < currentTerrain.position.x + TERRAIN_WIDTH && this.position.x + this.bounds.x + moveDistX > currentTerrain.position.x) {
						// terrain below us is solid ground and we'd be inside it if we moved down
						if (this.position.y + this.bounds.y + moveDistY > currentTerrain.position.y && currentTerrain.isSolid()) {
							// it's not safe to move
							positionSafe = false;
							break;
						}
					}
				}
				
				// if we're safe to move, shift down
				if (positionSafe || (this.position.y + this.bounds.y > currentTerrain.position.y)) {
					this.position.x += moveDistX;
					this.position.y += moveDistY;
				}
				// otherwise, bounce
				else {
					this.velocity.y *= -0.85;
					break;
				}
			}
			}
			// otherwise, just move
			else
				this.position.add(this.velocity);
			
			// increment death timer if the particle is barely moving
			if (this.velocity.length() < 0.1)
				++this.deathTime;
			// increment time lived
			++this.time;
			
			// delete this particle if its time lived has surpassed its lifetime, if it has been still for 100 ticks,
			// or if it has moved offscreen
			if ((this.time > this.lifetime && this.lifetime > 0) || this.deathTime > 100 ||
				 this.position.x < 0 || this.position.x > canvas.width || this.position.y < 0 || this.position.y > canvas.height) {
				particles.splice(particles.indexOf(this), 1);
				return;
			}
				
			// draw based on particle type
			ctx.drawImage(this.particleType.img, this.position.x, this.position.y);
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
		
		// spacebar - jump!
		if (e.keyCode === KEY.SPACE) {
			player.jump(15, 1);
			
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