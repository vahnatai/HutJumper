/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 * 
 * @author Vahnatai
 */

var FPS = 60;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var canvas;
var ball;
var lastTime = 0;

var KEY_UP = 38;
var KEY_DOWN = 40;
var KEY_LEFT = 37;
var KEY_RIGHT = 39;

var FRICTION_C = 0.15;

var BACKGROUND_TILE = new Image();
BACKGROUND_TILE.src = "./grass.png";
var BUNNY_IMG = new Image();
BUNNY_IMG.src = "./bunny.png";

var position = {
    x: 50,
    y: 50
};

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
	
	this.stepPosition = function() {
		var changed = false;
		if (this.velocity.getLength()) {
			this.position = this.position.add(this.velocity);
			changed = true;
		}
		return changed;
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


var update = function(delta) {
    //TODO
    ball.stepPosition();
    ball.stepVelocity();
};

var renderBackground = function(context) {
	context.fillStyle = context.createPattern(BACKGROUND_TILE, "repeat");
	context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	//context.drawImage(BACKGROUND_TILE, -position.x, -position.y);
}

var renderBall = function(context, ball) {
	var x = ball.position.x;
	var y = ball.position.y;
	
	context.drawImage(BUNNY_IMG, x, y, BUNNY_IMG.width/4, BUNNY_IMG.height/4);
	
	// context.fillStyle = context.createPattern(BUNNY_IMG, "no-repeat");
	// context.fillRect(x, y, );
	// var radius = ball.radius;
	// var startAngle = 0;
	// var endAngle = 2*Math.PI;
	// var clockwise = true;
	// var oldFill = context.fillStyle;
	// context.fillStyle = ball.color;
	// context.strokeStyle = "black";
	// context.beginPath();
	// context.arc(x, y, radius, startAngle, endAngle, clockwise);
	// context.closePath();
	// context.fill();
	// context.stroke();
	
}

function render(context) {
    context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	renderBackground(context);
	renderBall(context, ball);
    
	//TODO
    //context.fillStyle = "#000"; // Set color to black
    //context.fillText("Sup Broseph!", position.x, position.y);
};

function handleKeyup(event) {
	if ((event.keyCode == KEY_UP)||(event.keyCode == KEY_DOWN)) {
        ball.velocity.y -= ball.acceleration.y;
        ball.acceleration.y = 0; //stop going up/down
    } else if ((event.keyCode == KEY_LEFT)||(event.keyCode == KEY_RIGHT)) {
        ball.velocity.x -= ball.acceleration.x; 
        ball.acceleration.x = 0; //stop going left/right
    }
}

function handleKeydown(event) {
	var ADD_VALUE = 0.5;
	if (event.keyCode == KEY_UP) {
        ball.acceleration.y = -ADD_VALUE; //going up
    }
    if (event.keyCode == KEY_DOWN) {
        ball.acceleration.y = ADD_VALUE; //going down
    }
    if (event.keyCode == KEY_LEFT) {
        ball.acceleration.x = -ADD_VALUE; //going left
    }
    if (event.keyCode == KEY_RIGHT) {
        ball.acceleration.x = ADD_VALUE; //going right
    }
}

window.onload = function() {
    ball = new Ball(position.x, position.y, 5, "#FF0000");
    canvas = document.getElementById('mainCanvas');
	
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