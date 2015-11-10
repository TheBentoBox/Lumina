"use strict";

var KEY = {					// "enum" equating keycodes to names (e.g. keycode 32 = spacebar)
		SPACE: 32,
		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		DOWN: 40,
		ONE: 49,
		TWO: 50,
		THREE: 51,
		FOUR: 52,
		FIVE: 53,
		SIX: 54,
		A: 65,
		D: 68,
		E: 69,
		H: 72,
		P: 80,
		Q: 81,
		R: 82,
		S: 83,
		W: 87
	};

// get mouse pos on canvas
function getMouse(e){
	var mouse = {position: {}}
	mouse.position = Victor(e.pageX - e.target.offsetLeft, e.pageY - e.target.offsetTop);
	return mouse;
};

// returns random within a range
function rand(min, max) {
  	return Math.random() * (max - min) + min;
};

// returns a value that is constrained between min and max (inclusive)
function clamp(val, min, max){
	return Math.max(min, Math.min(max, val));
};

// fills a text with correct CSS and cleans up after itself
function fillText(ctx, string, x, y, css, color) {
	ctx.save();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
};

// fills a text with correct CSS and cleans up after itself
function fillTextAligned(ctx, string, x, y, css, color) {
	ctx.save();
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = css;
	ctx.fillStyle = color;
	ctx.fillText(string, x, y);
	ctx.restore();
};

 // activate fullscreen
function requestFullscreen(element) {
	if (element.requestFullscreen) {
	  element.requestFullscreen();
	} else if (element.mozRequestFullscreen) {
	  element.mozRequestFullscreen();
	} else if (element.mozRequestFullScreen) { 
	  element.mozRequestFullScreen();
	} else if (element.webkitRequestFullscreen) {
	  element.webkitRequestFullscreen();
	}
	// no response if unsupported
};

// This gives Array a randomElement() method
Array.prototype.randomElement = function(){
	return this[Math.floor(Math.random() * this.length)];
}