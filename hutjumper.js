/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 * 
 * @author Vahnatai
 */

var FPS = 60;
var BOUNDS_COLOR = "#111111";
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var CONTROL_FORCE = 1;
var JUMP_FORCE = 100;
var canvas;
var ball;
var world;
var lastTime = 0;

var FRICTION_C = 0.15;
var RESTITUTION = 0.75;
var GRAV_EARTH = new Vector(0, 9.81);

var KEYS = {
    up: {
        keycode: 87, //w
        pressed: false
    },
    down: {
        keycode: 83, //s
        pressed: false
    },
    left: {
        keycode: 65, //a
        pressed: false
    },
    right: {
        keycode: 68, //d
        pressed: false
    },
    jump: {
        keycode: 32, //space
        pressed: false
    },
    info: {
        keycode: 73, //i
        pressed: false
    }
};

var debugMode = false;

var BACKGROUND_TILE = new Image();
BACKGROUND_TILE.src = "./grass.png";
var BUNNY_IMG = new Image();
BUNNY_IMG.src = "./bunny.png";

var characterTilesToLoad;
var charTiles = getCharacterTiles();
var selectedChar = 0;

function getCanvasX(event) {
	// Get the mouse position relative to the canvas element.
	if (event.offsetX || event.offsetX == 0) {
		return event.offsetX;
	}else if (event.layerX || event.layerX == 0) { // Firefox
		return event.clientX - ((Constants.canvasPadding/2) + (Constants.canvasPadding%2));
	} 
}

function getCanvasY(event) {
	// Get the mouse position relative to the canvas element.
	if (event.offsetY || event.offsetY == 0) {
		return event.offsetY;
	}else if (event.layerY || event.layerY == 0) { // Firefox
		return event.clientY - ((Constants.canvasPadding/2) + (Constants.canvasPadding%2));
	} 
}

function getCharacterTiles() {
    var allTiles = new Array();
    var charTiles = new Array();
    var tileWidth = 18;
    var tileHeight = 38;
    var borderWidth = 3;
    var transparent = {
        r: 255,
        g: 174,
        b: 201
    }
    
    var ctx = document.createElement('canvas').getContext('2d');
    var tilesetImage = new Image();
    tilesetImage.src = "character_tiles.png";
    tilesetImage.onload = function() {    
        ctx.canvas.width = tilesetImage.width;
        ctx.canvas.height = tilesetImage.height;
        ctx.drawImage(tilesetImage, 0, 0);
        var tilesX = Math.floor(tilesetImage.width / (tileWidth + borderWidth));
        var tilesY = Math.floor(tilesetImage.height / (tileHeight + borderWidth));
        var totalTiles = tilesX * tilesY; 
        characterTilesToLoad = totalTiles;
        for (var i=0; i<tilesY; i++) {
          for (var j=0; j<tilesX; j++) {           
            // Convert the image data of each tile in the array to an image object
            var imgX = j * (tileWidth + borderWidth) + borderWidth;
            var imgY = i * (tileHeight + borderWidth) + borderWidth;
            var tileData = ctx.getImageData(imgX, imgY, tileWidth, tileHeight);
            var tempCtx = document.createElement("canvas").getContext("2d");
            tempCtx.canvas.width = tileWidth;
            tempCtx.canvas.height = tileHeight;
            tempCtx.putImageData(tileData, 0, 0);
            
            var tileImage = new Image();
            tileImage.src = tempCtx.canvas.toDataURL();
            tileImage.onload = function() {
                characterTilesToLoad -= 1;
            };
            allTiles.push(tileImage);
          }
        }
        for (var i = 0; i < totalTiles; i += 4) {
            charTiles.push(new CharacterTiles(allTiles[i], allTiles[i+1], allTiles[i+2], allTiles[i+3]));
        }
    }
    return charTiles;
}

function applyControls() {
    var controlV = new Vector(
        (KEYS.right.pressed - KEYS.left.pressed) * CONTROL_FORCE,
        (KEYS.down.pressed - KEYS.up.pressed) * CONTROL_FORCE);
    if (controlV.x < 0) {
        ball.facingLeft = true;
    } else if (controlV.x > 0) {
        ball.facingLeft = false;
    }
    
    if (KEYS.jump.pressed && ball.isOnGround()) {
        controlV = controlV.add(new Vector(0, -JUMP_FORCE));
    }
    if (KEYS.info.pressed) {
        KEYS.info.pressed = false;//toggle on press, disable holding to toggle forever
        debugMode = !debugMode;
    }
    
    ball.setAcceleration(controlV.add(GRAV_EARTH));
}


function update(delta) {
    //TODO
    applyControls();
    ball.stepPosition();
    ball.collideBounds();
    ball.stepVelocity();
};

function renderBackground(context) {
    // round because pixels are discrete units; not rounding makes the image fuzzy
    var x = Math.round(ball.position.x);
    var y = Math.round(ball.position.y);
    // static char, moving bg
    // translate before fill to offset the pattern,
    // then restore position
    context.save();
    context.fillStyle = context.createPattern(BACKGROUND_TILE, "repeat");
    context.translate(-x, -y);
    context.fillRect(x, y, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.restore();
}

function renderForeground(context) {
    //if they are visible from this position, render bounds
	if (ball.position.x - CANVAS_WIDTH/2 <= world.getMinX()) {
		context.fillStyle = BOUNDS_COLOR;
		context.fillRect(world.getMinX() - ball.position.x, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT);
	}
	if (ball.position.x + CANVAS_WIDTH/2 >= world.getMaxX()) {
		context.fillStyle = BOUNDS_COLOR;
		context.fillRect(world.getMaxX() - ball.position.x + CANVAS_WIDTH/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT);
	}
	if (ball.position.y - CANVAS_HEIGHT/2 <= world.getMinY()) {
		context.fillStyle = BOUNDS_COLOR;
		context.fillRect(0, world.getMinY() - ball.position.y, CANVAS_WIDTH, CANVAS_HEIGHT/2);
	}
	if (ball.position.y + CANVAS_WIDTH/2 >= world.getMaxY()) {
		context.fillStyle = BOUNDS_COLOR;
		context.fillRect(0, world.getMaxY() - ball.position.y + CANVAS_HEIGHT/2, CANVAS_WIDTH, CANVAS_HEIGHT/2);
	}
}

function renderBall(context, ball) {
    //static char, moving bg
    var tiles = charTiles[selectedChar];
    var currentFrame;
    
    var position;
    if (ball.facingLeft) {
        position = "left";
    } else {
        position = "right";
    }
    
    if (!ball.isOnGround() || (ball.position.x % 100) < 50) {
        position += "Walk";
    }
    currentFrame = tiles[position];
    context.drawImage(currentFrame, CANVAS_WIDTH/2 - currentFrame.width/2, CANVAS_HEIGHT/2 - currentFrame.height/2, currentFrame.width, currentFrame.height);
}

function renderHUD(context) {
    if (debugMode) {
        var x = Math.round(ball.position.x);
        var y = Math.round(ball.position.y);
        var velX = Math.round(ball.velocity.x);
        var velY = Math.round(ball.velocity.y);
        var accX = Math.round(ball.acceleration.x);
        var accY = Math.round(ball.acceleration.y);
        
        context.save();
        context.font = "20px Arial";
        context.globalAlpha = 0.7;
        context.fillStyle = "#FFFFFF";
        context.fillText("x: " + x + ", y: " + y, 20, 20);
        context.fillText("velX: " + velX + ", velY: " + velY, 20, 50);
        context.fillText("accX: " + accX + ", accY: " + accY, 20, 80);
        context.restore();
    }
}

function render(context) {
    //context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	renderBackground(context);
    renderForeground(context);
	renderBall(context, ball);
    renderHUD(context);
	//TODO
};

function handleKeyup(event) {
	//update which key is now not pressed
    for (k in KEYS) {
        var key = KEYS[k];
        if (event.keyCode === key.keycode) {
            key.pressed = false;
            break;
        }
    }
}

function handleKeydown(event) {
    //update which key is now pressed
    for (k in KEYS) {
        var key = KEYS[k];
        if (event.keyCode === key.keycode) {
            key.pressed = true;
            break;
        }
    }
}

function exampleLoadJSON() {
    var request;
    if (window.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        request = new XMLHttpRequest();
    } else {
        // code for IE6, IE5
        request = new ActiveXObject("Microsoft.XMLHTTP");
    }
    request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
            //TODO something with JSON.parse(req.responseText)
        }
    }
    request.open("GET", "ajax_info.txt", true);
    request.send();
}

function handleBlur() {
    //no keys are pressed
    for (k in KEYS) {
        var key = KEYS[k];
        key.pressed = false;
    }
}

function changeCurrentCharacter() {
    selectedChar = (selectedChar + 1) % charTiles.length;
}

function main() {
    ball = new Ball(15, 15, 19, "#FF0000");
    canvas = document.getElementById('mainCanvas');
	world = new World();
    
    // set up keyboard input listeners
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("keyup", handleKeyup);
	document.addEventListener("click", function() {
        var coinSound = new Audio("mariocoin.wav");
        changeCurrentCharacter();
        coinSound.play();
    });
	window.addEventListener("blur", handleBlur);
	
	var context = canvas.getContext("2d");
	setInterval(function() {
        var time = new Date().getTime();
        var delta = (lastTime ? (lastTime - time) : 0);
        update(delta);
        render(context);
    }, 1000/FPS);
}

window.onload = function() {
	//check on an interval for loaded tiles before continuing
	var intervalId = setInterval(function() {
		if (characterTilesToLoad) {
			return;
		}
		clearInterval(intervalId);
		main();
	}, 1000/FPS);
};