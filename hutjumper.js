/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 * 
 * @author Vahnatai
 */

var INCLUDES = ["hutjumper-model.js"];

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
var myCharTiles;

/*========Vector Class========*/
function Vector(x, y) {
	//default parameter values 
	if (!x){
		x = 0;
	}
	if (!y){
		y = 0;
	}
	
	this.x = x;
	this.y = y;

	this.getLength = function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	}
	
	this.normalized = function() {
		var length = this.getLength();
		var x = this.x / length;
		var y = this.y / length;
		return new Vector(x, y);
	}
	
	this.add = function(that) {
		var x = this.x + that.x;
		var y = this.y + that.y;
		return new Vector(x, y);
	}
	
	this.subtract = function(that) {
		var x = this.x - that.x;
		var y = this.y - that.y;
		return new Vector(x, y);
	}
	
	this.dotProduct = function(that) {
		return ( (this.x * that.x) + (this.y * that.y) );
	}
	
	this.multiplyScalar = function(scalar) {
		var x = (this.x * scalar);
		var y = (this.y * scalar);
		return new Vector(x, y);
	}
}

/*========Ball Class========*/
function Ball(x, y, radius, color) {
	if (!color) {
		color = "#000000";
	}
	
	this.position = new Vector(x,y);
	this.radius = radius;
    this.width = 18;
    this.height = 38;
    this.facingLeft = true;
	this.mass = 1;

	this.velocity = new Vector();
	this.acceleration = new Vector();
	
	this.color = color;
	
	this.setAcceleration = function(accel) {
		this.acceleration = accel;
	}

	this.stepVelocity = function() {
		var changed = false;
        var friction = this.velocity.multiplyScalar(FRICTION_C);
        
		this.velocity = this.velocity.add(this.acceleration).subtract(friction);
	};
	
    /**
     * XXX maybe this function should be moved out of the ball class,
     * to World or some game logic elsewhere?
     */
	this.stepPosition = function() {
		var changed = false;
		if (this.velocity.getLength()) {
            //XXX
			this.position = this.position.add(this.velocity);
		}
	};
	
	this.isOnGround = function() {
		return this.position.y + this.radius >= world.getMaxY();
	};
	
	this.isColliding = function(that) {
		if (!(that instanceof Ball)) {
			return false;
		}
		if (this == that) {
			return false;
		}
		var delta = this.position.subtract(that.position);
		var distance = delta.getLength();
		var range = this.radius + that.radius;
		
		return (distance <= range);
	};
	
	this.collide = function(that) {
		var delta = this.position.subtract(that.position);
		var d = delta.getLength();
		// minimum translation distance
		var mtd = delta.multiplyScalar(((this.radius + that.radius)-d)/d);
		
		//inverse mass quantities
		var im1 = 1.0/this.mass;
		var im2 = 1.0/that.mass;
		
		/** # */
		
		// push-pull them apart based off their mass
	    this.position = this.position.add(mtd.multiplyScalar(im1 / (im1 + im2)));
	    that.position = that.position.subtract(mtd.multiplyScalar(im2 / (im1 + im2)));

	    
	    // impact speed
	    var v = (this.velocity.subtract(that.velocity));
	    var vn = v.dotProduct(mtd.normalized());
	    
	    // sphere intersecting but moving away from each other already
	    if (vn > 0.0){
	    	//alert("Bump1: " + vn);
		return;
	    }
	    //alert("Bump2: " + vn);
	    // collision impulse
	    var i = (-(1.0 + RESTITUTION) * vn) / (im1 + im2);
	    var impulse = mtd.normalized().multiplyScalar(i);

	    // change in momentum
	    this.velocity = this.velocity.add(impulse.multiplyScalar(im1));
	    that.velocity = that.velocity.subtract(impulse.multiplyScalar(im2));
	};
	
	this.collideBounds = function() {
        var minX = world.getMinX();
        var maxX = world.getMaxX();
        var minY = world.getMinY();
        var maxY = world.getMaxY();
    
		if ((this.position.x - this.radius <= minX) 
				&& (this.velocity.x < 0)) { 
			this.velocity.x = -this.velocity.x * RESTITUTION;
			this.position.x = minX + this.radius; 
		} else if ((this.position.x + this.radius >= maxX)
				&& (this.velocity.x > 0) ) {
			this.velocity.x = -this.velocity.x * RESTITUTION;
			this.position.x = maxX - this.radius;
		}
		if (this.position.y - this.radius <= minY
				&& (this.velocity.y < 0) ) {
			this.velocity.y = -this.velocity.y * RESTITUTION;
			this.position.y = minY + this.radius;
		} else if (this.position.y + this.radius >= maxY
				&& (this.velocity.y > 0) ) {
			this.velocity.y = -this.velocity.y * RESTITUTION;
			this.position.y = maxY - this.radius;
		}
	};
}

/*========World Class========*/
function World() {
    var CELL_WIDTH_PX = 50;
    var CELL_HEIGHT_PX = 50;
    this.data = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]]
    
    this.getMinX = function() {
        return 0;
    }
    this.getMaxX = function() {
        return this.data[0].length * CELL_WIDTH_PX;
    }
    this.getMinY = function() {
        return 0;
    }
    this.getMaxY = function() {
        return this.data.length * CELL_WIDTH_PX;
    }
    
}

/*========CharacterTiles Class========*/
function CharacterTiles(left, leftWalk, rightWalk, right) {
    this.left = left;
    this.leftWalk = leftWalk;
    this.right = right;
    this.rightWalk = rightWalk;
}

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
    var tiles = charTiles[0];
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
    /*context.putImageData(tilesData[0], CANVAS_WIDTH/2 - 32, CANVAS_HEIGHT/2 - 32);*/
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

function main() {
    ball = new Ball(0, 0, 19, "#FF0000");
    canvas = document.getElementById('mainCanvas');
	world = new World();
    
    // set up keyboard input listeners
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("keyup", handleKeyup);
	document.addEventListener("click", function() {
        var coinSound = new Audio("mariocoin.wav");
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

/** Load all libraries **/
function loadIncludesAndRunMain() {
    var deferreds = [];
    for (i in INCLUDES) {
        var deferred = $.getScript(INCLUDES[i]);
        deferreds.push(deferred);
    }
    deferreds.push($.Deferred(function( deferred ){
        $(deferred.resolve);
    }));
    $.when(deferreds).then(function() {
        //included libraries loaded
        //check on an interval for loaded tiles before continuing
        var intervalId = setInterval(function() {
            if (characterTilesToLoad) {
                return;
            }
            clearInterval(intervalId);
            main();
        }, 1000/FPS);
    });
}

window.onload = function() {
    loadIncludesAndRunMain();
};