 // window-manager.js
"use strict";
// if game exists use the existing copy
// else create a new object literal
var game = game || {};

game.windowManager = (function(){
	console.log("Loaded window-manager.js module");
	var canvas;  // reference to game's canvas
	var ctx;     // 2D canvas context
	
	var uiElements = [];			// UI elements on the screen
	// FUNCTION: find named object in array
	uiElements.find = function(name){
		for(var i=0; i < this.length; i++){
			if(this[i].name == name){return this[i]};
		};
	};
	
	// FUNCTION: initalize canvas variables for window manager
	function init() {
		canvas = document.querySelector("canvas");	
		ctx = canvas.getContext("2d");				
		
		canvas.addEventListener("click", checkMouse);		// click event to check mouse on UI
		canvas.addEventListener("touchstart", checkMouse);	// tap event to check touch on UI
		
		updateAndDraw();
	}
	
	// FUNCTION: update and draw window
	function updateAndDraw(trackers){
		for(var i=0; i < uiElements.length; i++){
			uiElements[i].updateAndDraw(trackers);
		}
	}
	
	// FUNCTION: check clicks on UI
	function checkMouse(e){
		var mouse = getMouse(e);	// mouse position
		var elem;					// UI element
		var but;					// button
		var clicked = false;
		// check if any UI elements were clicked
		for(var i=0; i < uiElements.length; i++){
			elem = uiElements[i];
			//console.log("Element bounds: " + elem.position.x + ", " + elem.position.y + ", " + (elem.position.x + elem.size.x) + ", " + (elem.position.y + elem.size.y));
			if(mouse.position.x >= elem.position.x && mouse.position.x <= (elem.position.x + elem.size.x) && mouse.position.y >= elem.position.y && mouse.position.y <= (elem.position.y + elem.size.y) && elem.isActive){
				clicked = true;
				// check if any buttons were clicked inside the clicked element
				for(var j=0; j < uiElements[i].buttons.length; j++){
					but = elem.buttons[j];
					if(mouse.position.x >= elem.position.x + but.offset.x && mouse.position.x <= elem.position.x + but.offset.x + but.size.x && mouse.position.y >= elem.position.y + but.offset.y && mouse.position.y <= elem.position.y + but.offset.y + but.size.y && but.isActive){
						// call click event of clicked button if it has one
						if (but.onClick != undefined) {
							but.onClick();
							return clicked;
						}
					}
				}
			}
		}
		//console.log(clicked);
		return clicked;
	}
	
	// FUNCTION: make new UI object
	function makeUI(name, xPos, yPos, width, height) {
		uiElements.push(new UI(name, xPos, yPos, width, height));
	}
	
	// FUNCTION: make a new button
	function makeButton(uiName, butName, offsetX, offsetY, width, height, clickEvent){
		uiElements.find(uiName).buttons.push(new button(uiName, butName, offsetX, offsetY, width, height, clickEvent));
	}
	
	// FUNCTION: make a new bar
	function makeBar(uiName, barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin){
		uiElements.find(uiName).bars.push(new bar(uiName, barName, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin));
	}
	
	// FUNCTION: make a new text box
	function makeText(uiName, textName, offsetX, offsetY, width, height, string, css, color){
		uiElements.find(uiName).texts.push(new text(uiName, textName, offsetX, offsetY, width, height, string, css, color));
	}
	
	// FUNCTION: modify UI variables
	function modifyUI(uiName, varName, args){
		var elem = uiElements.find(uiName);
		switch(varName){
			case("all"):
				elem.setName(args.name);
				elem.setPosition(args.xPos, args,yPos);
				elem.setSize(args.width, args.height);
				elem.setBorder(args.color, args.width);
				elem.setFill(args.color);
				elem.setImage(args.image);
				break;
			case("name"):
				elem.setName(args.name);
				break;
			case("position"):
				elem.setPosition(args.xPos, args,yPos);
				break;
			case("size"):
				elem.setSize(args.width, args.height);
				break;
			case("border"):
				elem.setBorder(args.color, args.width);
				break;
			case("fill"):
				elem.setFill(args.color);
				break;
			case("image"):
				elem.setImage(args.image);
				break;
		}
	}
	
	// FUNCTION: toggle UI
	function toggleUI(name){
		uiElements.find(name).toggleActive();
	}
	
	// FUNCTION: forcibly deactivates UI element
	function deactivate(name){
		uiElements.find(name).deactivate();
	};
	
	// FUNCTION: forcibly activate UI element
	function activate(name){
		uiElements.find(name).activate();
	};
		
	// FUNCTION: toggle whether UI pauses game when active
	function toggleUIPausing(name){
		uiElements.find(name).togglePause();
	}
	
	// FUNCTION: modify button variables
	function modifyButton(uiName, buttonName, varName, args){
		var but = uiElements.find(uiName).buttons.find(buttonName);
		switch(varName){
			case("all"):
				but.setName(args.name);
				but.setOffset(args.xPos, args,yPos);
				but.setSize(args.width, args.height);
				but.setBorder(args.color, args.width);
				but.setFill(args.color);
				but.setImage(args.image);
				but.setText(args.string, args.css, args.color);
				but.setClick(args.event);
				but.setHover(args.event);
				break;
			case("name"):
				but.setName(args.name);
				break;
			case("offset"):
				but.setOffset(args.xPos, args,yPos);
				break;
			case("size"):
				but.setSize(args.width, args.height);
				break;
			case("border"):
				but.setBorder(args.color, args.width);
				break;
			case("fill"):
				but.setFill(args.color);
				break;
			case("image"):
				but.setImage(args.image);
				break;
			case("text"):
				but.setText(args.string, args.css, args.color);
				break;
			case("click"):
				but.setClick(args.event);
				break;
			case("hover"):
				but.setHover(args.event);
				break;
		}
	}
	
	// FUNCTION: toggle button
	function toggleButton(uiName, buttonName){
		uiElements.find(uiName).buttons.find(buttonName).toggleActive();
	}
	
	//FUNCTION: modify status bar variables
	function modifyBar(uiName, barName, varName, args){
		var bar = uiElements.find(uiName).bars.find(barName);
		switch(varName){
			case("name"):
				bar.setName(args.name);
				break;
			case("offset"):
				bar.setOffset(args.xPos, args,yPos);
				break;
			case("size"):
				bar.setSize(args.width, args.height);
				break;
			case("border"):
				bar.setBorder(args.color, args.width);
				break;
			case("fill"):
				bar.setFill(args.backColor, args.foreColor);
				break;
			case("image"):
				bar.setImage(args.backImage, args.foreImage);
				break;
			case("text"):
				bar.setText(args.string, args.css, args.color);
				break;
			case("target"):
				bar.setTarget(args.tgtVar, args.tgtMax, args.tgtMin);
				break;
		}
	}
	
	// FUNCTION: toggle bar
	function toggleBar(uiName, barName){
		uiElements.find(uiName).bars.find(barName).toggleActive();
	}
	
	// FUNCTION: modify text variables
	function modifyText(uiName, textName, varName, args){
		var text = uiElements.find(uiName).texts.find(textName);
		switch(varName){
			case("name"):
				text.setName(args.name);
				break;
			case("offset"):
				text.setOffset(args.xPos, args,yPos);
				break;
			case("size"):
				text.setSize(args.width, args.height);
				break;
			case("border"):
				text.setBorder(args.color, args.width);
				break;
			case("spacing"):
				text.setSpacing(args.top, args.right, args.bottom, args.left, args.line);
			case("fill"):
				text.setFill(args.color);
				break;
			case("image"):
				text.setImage(args.image);
				break;
			case("text"):
				text.setText(args.string, args.css, args.color);
				break;
			case("target"):
				text.setTarget(args.targets);
		}
	}
	
	// FUNCTION: toggle text
	function toggleText(uiName, textName){
		uiElements.find(uiName).texts.find(textName).toggleActive();
	}
	
	// CLASS: user interface object
	var UI = function(name, xPos, yPos, width, height) {
		// element name
		this.name = name;
		
		// base position of UI element
		this.position = new Victor(xPos, yPos);
		
		// element size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "";			// background fill color
		this.image = new Image();		// background image
		this.isActive = false; 			// if the element is active and displayed
		this.doesPause = false; 		// if the element pauses the game when active
		
		this.buttons = [];			// array of contained buttons
		this.bars = [];				// array of status bars
		this.texts = [];			// array of text boxes
		// FUNCTION: find named object in array
		this.buttons.find = this.bars.find = this.texts.find = function(name){
			for(var i=0; i < this.length; i++){
				if(this[i].name == name){return this[i]};
			};
		};
		
		//{ UI MODIFIERS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		};
		
		// MUTATOR: set UI position
		this.setPosition = function(xPos, yPos){
			this.position = new Victor(xPos, yPos);
		};
		
		// MUTATOR: set up bounding rectangle
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		};
		
		// MUTATOR: set border
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};	// set color to "" to stop border drawing
		};
		
		// MUTATOR: set fill
		this.setFill = function(color){
			this.fillColor = color;		// set to "" to stop color fill
		};
		
		// MUTATOR: set background image
		this.setImage = function(image){
			this.image = image;		// set to null to stop image drawing
		};
		
		// FUNCTION: toggle whether element is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		};
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		
		// FUNCTION: toggle whether element pauses game
		this.togglePause = function(){
			this.doesPause = !this.doesPause;
		};
		//} UI MODIFIERS
		
		// FUNCTION: update and draw UI element
		this.updateAndDraw = function(trackers){
			if (this.isActive){
				// fill color
				if (this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(this.position.x, this.position.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(this.position.x, this.position.y, this.size.x, this.size.y);
				}
				
				// draw image
				if(this.image.src != null){
					ctx.drawImage(this.image, this.position.x, this.position.y);
				}
				
				// update tracked variables
				for(var i=0; i < trackers.length; i++){
					var bar = this.bars.find(trackers[i].name);
					var text = this.texts.find(trackers[i].name);
					if(bar != null){
						bar.target.value = trackers[i].value;
					}
					if(text != null){
						text.trackers = trackers[i].value;
					}
				}
				
				// update and draw buttons
				for(var i=0; i < this.buttons.length; i++){
					this.buttons[i].updateAndDraw();
				}
				
				// update and draw bars
				for(var i=0; i < this.bars.length; i++){
					this.bars[i].updateAndDraw();
				}
				
				// update and draw text
				for(var i=0; i < this.texts.length; i++){
					this.texts[i].updateAndDraw();
				}
			}		
		};
	};
	
	// CLASS: button object
	var button = function(parentName, name, offsetX, offsetY, width, height, clickEvent) {
		// reference names
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Victor(offsetX, offsetY);
		
		// button size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		this.fillColor = "gray";		// background fill color
		this.image = new Image();		// background image
		this.isActive = false; 			// if the element is active and displayed
		
		// text on button
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		this.onClick = clickEvent;		// event to fire on click
		this.onHover = undefined;		// event to fire on hover
		
		// FUNCTION: update and draw button if active
		this.updateAndDraw = function() {
			if (this.isActive) {	
				var par = uiElements.find(this.parentName);
				// fill color
				if(this.fillColor != ""){
					ctx.fillStyle = this.fillColor;
					ctx.fillRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// draw image
				if(this.image.src != null){
					ctx.drawImage(this.image, par.position.x + this.offset.x, par.position.y + this.offset.y);
				}
				
				// print text
				if (this.text.string != "") {
					fillText(ctx, this.text.string, (par.position.x + this.offset.x + this.size.x / 2), (par.position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BUTTON FUNCTIONS
		// MUTATOR: set button name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set button offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Victor(offsetX, offsetY);
		}
		
		// MUTATOR: set button size
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		}
		
		// MUTATOR: set button border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set button color
		this.setFill = function(color){
			this.fillColor = color;
		}
		
		// MUTATOR: set button image
		this.setImage = function(image){
			this.image = image;
		}
		
		// MUTATOR: set button text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set button click event
		this.setClick = function(event){
			this.onClick = event;
		}
		
		// MUTATOR: set button hover event
		this.setHover = function(event){
			this.onHover = event;
		}
		
		// FUNCTION: toggle whether button is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//} BUTTON FUNCTIONS
	};
	
	// CLASS: status bar object
	var bar = function(parentName, name, offsetX, offsetY, width, height, tgtVar, tgtMax, tgtMin) {
		// reference name
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Victor(offsetX, offsetY);
		
		// bar size
		this.size = new Victor(width, height);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		// fill colors
		this.color = {
			back: "gray",
			fore: "green",
		}
		
		// fill images
		this.image = {
			back: new Image(),
			fore: new Image()
		}
		
		this.isActive = false; 			// if the element is active and displayed
		
		// variable to be tracked by bar
		this.target = {
			value: tgtVar,
			max: tgtMax,
			min: tgtMin,
		}
		
		// text on bar
		this.text = {
			string: "",
			css: "",
			color: "",
		};
		
		// FUNCTION: update and draw bar if active
		this.updateAndDraw = function() {
			if (this.isActive){	
				var par = uiElements.find(this.parentName);
				// percent fill of bar
				var percent = clamp(this.target.value / (this.target.max - this.target.min), 0.0, 1.0);
				
				// fill background color
				if(this.color.back != ""){
					ctx.fillStyle = this.color.back;
					ctx.fillRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// fill foreground color
				if(this.color.fore != ""){
					ctx.fillStyle = this.color.fore;
					ctx.fillRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				
				// draw background image
				if(this.image.back.src != null){
					ctx.drawImage(this.image.back, par.position.x + this.offset.x, par.position.y + this.offset.y);
				}
				
				// draw foreground image
				if(this.image.fore.src != ""){
					ctx.drawImage(this.image.fore, 0, 0, this.size.x * percent, this.size.y, par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x * percent, this.size.y);
				}
				// print text
				if(this.text.string != "") {
					fillText(ctx, this.text.string, (par.postition.x + this.offset.x + this.size.x / 2), (par.position.y + this.offset.y + this.size.y / 2), this.text.css, this.text.color);
				}
			}
		}
		
		//{ BAR FUNCTIONS
		// MUTATOR: set bar name
		this.setName = function(newName){
			this.name = newName;
		}
		
		// MUTATOR: set bar offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Victor(offsetX, offsetY);
		}
		
		// MUTATOR: set bar size
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		}
		
		// MUTATOR: set bar border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		}
		
		// MUTATOR: set bar color
		this.setFill = function(backColor, foreColor){
			this.color = {back: backColor, fore: foreColor};
		}
		
		// MUTATOR: set bar image
		this.setImage = function(backImage, foreImage){
			this.image.back = backImage;
			this.image.fore = foreImage;
		}
		
		// MUTATOR: set bar text
		this.setText = function(string, css, color){
			this.text = {string:string, css:css, color:color};
		}
		
		// MUTATOR: set bar target
		this.setTarget = function(tgtVar, tgtMax, tgtMin){
			this.target = {value: tgtVar, max: tgtMax, min: tgtMin};
		}
		
		// FUNCTION: toggle whether bar is active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		}
		
		// FUNCTION: forcibly deactivates the element
		this.deactivate = function(){
			this.isActive = false;
		};
		
		// FUNCTION: forcibly activate the element
		this.activate = function(){
			this.isActive = true;
		};
		//} BAR FUNCTIONS
	}

	// CLASS: text box object
	var text = function(parentName, name, offsetX, offsetY, width, height, string, css, color) {
		// reference name
		this.parentName = parentName;
		this.name = name;
		
		// offset from base UI element
		this.offset = new Victor(offsetX, offsetY);
		
		// text box size
		var w = width, h = height;
		if (w === "default") w = ctx.measureText(string).width;
		if (h === "default") h = w*1.5;
		this.size = new Victor(w, h);
		
		// border styling
		this.border = {
			color: "",
			width: 0,
		};
		
		// text spacing
		this.spacing = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
			line: 0,
		};
		
		// fill colors
		this.color = "rgba(0, 0, 0, 0)";
		
		// fill images
		this.image = new Image();
		
		// if the element is active and displayed
		this.isActive = false; 
		
		// text
		this.text = {
			string: string,
			output: string,
			css: css,
			color: color,
		};
		
		// data to track in formatted string
		this.trackers = [];
		
		// FUNCTION: update and draw if active
		this.updateAndDraw = function() {
			if (this.isActive){		
				var par = uiElements.find(this.parentName);
				// fill background color
				if(this.color != "") {
					ctx.fillStyle = this.color;
					ctx.fillRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// stroke border
				if(this.border.color != ""){
					ctx.strokeStyle = this.border.color;
					ctx.lineWidth = this.border.width;
					ctx.strokeRect(par.position.x + this.offset.x, par.position.y + this.offset.y, this.size.x, this.size.y);
				}
				
				// draw background image
				if(this.image != null){
					ctx.drawImage(this.image, par.position.x + this.offset.x, par.position.y + this.offset.y);
				}
				// update formatted text
				if(this.trackers.length != 0){
					var trackIndex = 0;
					var str = this.text.string;
					for(var i=0; i < str.length-1; i++){
						if(str.charAt(i) == "%" && str.charAt(i + 1) == "v"){
							str = (str.substr(0,i) + this.trackers[trackIndex] + str.substr(i+2));
							i += this.trackers[trackIndex].length;
							trackIndex++;
						}
					}
					this.text.output = str;
				}
				
				// print text
				if(this.text.output != "") {
					// save canvas context and set up drawing variables
					ctx.save();
					ctx.textAlign = "left";
					ctx.textBaseline = "top";
					ctx.font = this.text.css;
					ctx.fillStyle = this.text.color;
					
					// prepare variables for drawing string with wrapping
					var str = this.text.output;
					var line = 0;
					var xPos = 0;
					var height = (ctx.measureText(str).width/str.length) * 1.5;
					
					// loop through letters
					for(var i = 0; i < str.length; i++){
						// if currently looped character is a space or we've reached the end of the string, draw the word
						if (str.charAt(i) == " " || i == str.length - 1) {
							// get the current word
							var subtext = str.substr(0, i+1);
							var measured = ctx.measureText(subtext);
							
							// wrap down to next line if the current word:
							// 1 - would go outside the textbox (xPos + it's width > box size - padding)
							// 2 - isn't wider than the textbox on its own (xPos > 0 - only wraps if it's not the first word)
							if (xPos + measured.width > this.size.x - this.spacing.left - this.spacing.right && xPos > 0) {
								++line;
								xPos = 0;
							}
							
							// draw the text
							ctx.fillText(subtext, par.position.x + this.offset.x + this.spacing.left + xPos, par.position.y + this.offset.y + this.spacing.top + (height*line));
							// update drawing variables
							xPos += measured.width; // slide draw position over
							str = str.substr(i);    // cut out the word we just drew from the string
							i = 0;					// start at the beginning of the new substring
						}
					}
					ctx.restore();
				}
			}
		};
		
		//{ TEXT FUNCTIONS
		// MUTATOR: set name
		this.setName = function(newName){
			this.name = newName;
		};
		
		// MUTATOR: set offset
		this.setOffset = function(xOffset, yOffset){
			this.offset = new Victor(offsetX, offsetY);
		};
		
		// MUTATOR: set size
		this.setSize = function(width, height){
			this.size = new Victor(width, height);
		};
		
		// MUTATOR: set border styling
		this.setBorder = function(color, width){
			this.border = {color:color, width:width};
		};
		
		this.setSpacing = function(top, right, bottom, left, line){
			this.spacing = {top:top, right:right, bottom:bottom, left:left, line:line};
		};
		
		// MUTATOR: set color
		this.setFill = function(color){
			this.color = {color: color};
		};
		
		// MUTATOR: set image
		this.setImage = function(image){
			this.image = image;
		};
		
		// MUTATOR: set text
		this.setText = function(string, css, color){
			this.text = {string:string, output:string, css:css, color:color};
		};
		
		// MUTATOR: set targets
		this.setTarget = function(targets){
			this.trackers = targets;
		};
		
		// FUNCTION: toggle if active
		this.toggleActive = function(){
			this.isActive = !this.isActive;
		};
		//} TEXT FUNCTIONS
	}
	
	return {
		init: init,
		updateAndDraw: updateAndDraw,
		checkMouse: checkMouse,
		makeUI: makeUI,
		makeButton: makeButton,
		makeBar: makeBar,
		makeText: makeText,
		modifyUI: modifyUI,
		toggleUI: toggleUI,
		activate: activate,
		deactivate: deactivate,
		toggleUIPausing: toggleUIPausing,
		modifyButton: modifyButton,
		toggleButton: toggleButton,
		modifyBar: modifyBar,
		toggleBar: toggleBar,
		modifyText: modifyText,
		toggleText: toggleText
	}
}());