/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 * 
 * @author Vahnatai
 */

var FPS = 120;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var canvas;
var ball;
var world;
var lastTime = 0;

var KEYS = {
    up: false,
    down: false,
    left: false,
    right: false
};
var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_LEFT = 37;
var KEY_RIGHT = 39;

var FRICTION_C = 0.15;

var BACKGROUND_TILE = new Image();
BACKGROUND_TILE.src = "./grass.png";
var BUNNY_IMG = new Image();
BUNNY_IMG.src = "./bunny.png";

var GRAV_EARTH = new Vector(0, 9.81);

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
        if (friction.getLength()) {
            //alert("friction is " + friction.x + ", acceleration is " + this.acceleration.x);
        }
		this.velocity = this.velocity.add(this.acceleration).subtract(friction);
	};
	
    /**
     * XXX maybe this function should be moved out of the ball class,
     * to World or some game logic elsewhere?
     */
	this.stepPosition = function() {
		var changed = false;
		if (this.velocity.getLength()) {
			var newPos = this.position.add(this.velocity);
            var minX = world.getMinX();
            var maxX = world.getMaxX();
            var minY = world.getMinY();
            var maxY = world.getMaxY();
            if (newPos.x < minX) {newPos.x = minX;}
            if (newPos.y < minY) {newPos.y = minY;}
            if (newPos.x > maxX) {newPos.x = maxX;}
            if (newPos.y > maxY) {newPos.y = maxY;}
            this.position = newPos;
		}
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
	    var i = (-(1.0 + Constants.restitution) * vn) / (im1 + im2);
	    var impulse = mtd.normalized().multiplyScalar(i);

	    // change in momentum
	    this.velocity = this.velocity.add(impulse.multiplyScalar(im1));
	    that.velocity = that.velocity.subtract(impulse.multiplyScalar(im2));
	};
	
	this.collideBounds = function() {
		if ((this.position.x - this.radius <= 0) 
				&& (this.velocity.x < 0)) { 
			this.velocity.x = -this.velocity.x * Constants.restitution;
			this.position.x = 0 + this.radius; 
		} else if ((this.position.x + this.radius >= width)
				&& (this.velocity.x > 0) ) {
			this.velocity.x = -this.velocity.x * Constants.restitution;
			this.position.x = width - this.radius;
		}
		if (this.position.y - this.radius <= 0
				&& (this.velocity.y < 0) ) {
			this.velocity.y = -this.velocity.y * Constants.restitution;
			this.position.y = 0 + this.radius;
		} else if (this.position.y + this.radius >= height
				&& (this.velocity.y > 0) ) {
			this.velocity.y = -this.velocity.y * Constants.restitution;
			this.position.y = height - this.radius;
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

function applyControls() {
    var ADD_VALUE = 0.5;
    ball.acceleration.y = (KEYS.down - KEYS.up) * ADD_VALUE; //going up/down
    ball.acceleration.x = (KEYS.right - KEYS.left) * ADD_VALUE; //going up/down
}


function update(delta) {
    //TODO
    applyControls();
    ball.stepPosition();
    ball.stepVelocity();
};

function renderBackground(context) {
    // static char, moving bg
    // translate before fill to offset the pattern,
    // then restore position
    context.save();
    context.fillStyle = context.createPattern(BACKGROUND_TILE, "repeat");
    context.translate(-ball.position.x, -ball.position.y);
    context.fillRect(ball.position.x, ball.position.y, CANVAS_WIDTH, CANVAS_HEIGHT);
    context.restore();
}

function renderForeground(context) {
    //TODO
}

function renderBall(context, ball) {
    //static char, moving bg
	context.drawImage(BUNNY_IMG, CANVAS_WIDTH/2 - BUNNY_IMG.width/8, CANVAS_HEIGHT/2 - BUNNY_IMG.height/8,
        BUNNY_IMG.width/4, BUNNY_IMG.height/4);
}

function renderHUD(context) {
    //TODO
    var x = Math.round(ball.position.x);
    var y = Math.round(ball.position.y);
    context.font="20px Arial";
    context.fillStyle = "#000000";
    context.strokeText("x: " + x + ", y: " + y, 20, 20);
    context.fillStyle = "#FFFFFF";
    context.fillText("x: " + x + ", y: " + y, 20, 20);
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
	//update which keys are not pressed
	if (event.keyCode == KEY_UP) {
        KEYS.up = false;
    } else if (event.keyCode == KEY_DOWN) {
        KEYS.down = false;
    } else if (event.keyCode == KEY_LEFT) {
        KEYS.left = false;
    } else if (event.keyCode == KEY_RIGHT) {
        KEYS.right = false;
    }
}

function handleKeydown(event) {
    //update which keys are pressed
	if (event.keyCode == KEY_UP) {
        KEYS.up = true;
    } else if (event.keyCode == KEY_DOWN) {
        KEYS.down = true;
    } else if (event.keyCode == KEY_LEFT) {
        KEYS.left = true;
    } else if (event.keyCode == KEY_RIGHT) {
        KEYS.right = true;
    }
}

function exampleLoadJSON() {
    var xmlhttp;
    if (window.XMLHttpRequest) {
        // code for IE7+, Firefox, Chrome, Opera, Safari
        xmlhttp = new XMLHttpRequest();
    } else {
        // code for IE6, IE5
        xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            //TODO something with JSON.parse(req.responseText)
        }
    }
    xmlhttp.open("GET", "ajax_info.txt", true);
    xmlhttp.send();
}

window.onload = function() {
    ball = new Ball(0, 0, 5, "#FF0000");
    canvas = document.getElementById('mainCanvas');
	world = new World();
    
    // set up keyboard input listeners
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("keyup", handleKeyup);
	
	var context = canvas.getContext("2d");
	setInterval(function() {
        var time = new Date().getTime();
        var delta = (lastTime ? (lastTime - time) : 0);
        update(delta);
        render(context);
    }, 1000/FPS);
};