"use strict";

// create new game object if none exists
var game = game || {};


window.onload = function(){
	console.log("Loading game...");
	game.windowManager.init();
	game.engine.init();
};

window.onblur = function() {
	game.engine.pauseGame();
};

window.onfocus = function() {
	game.engine.resumeGame();
};

// callback for button presses
window.addEventListener("keydown", game.engine.keyPress);