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
var renderer;
var lastTime = 0;
var gameState;

var FRICTION_C = 0.15;
var RESTITUTION = 0.75;
var GRAV_EARTH = new HutJumper.Model.Vector(0, 9.81);

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
    var controlV = new HutJumper.Model.Vector(
        (KEYS.right.pressed - KEYS.left.pressed) * CONTROL_FORCE,
        (KEYS.down.pressed - KEYS.up.pressed) * CONTROL_FORCE);
    if (controlV.x < 0) {
        gameState.getBall().facingLeft = true;
    } else if (controlV.x > 0) {
        gameState.getBall().facingLeft = false;
    }
    
    if (KEYS.jump.pressed && gameState.getBall().isOnGround(gameState.getWorld())) {
        controlV = controlV.add(new HutJumper.Model.Vector(0, -JUMP_FORCE));
    }
    if (KEYS.info.pressed) {
        KEYS.info.pressed = false;//toggle on press, disable holding to toggle forever
        debugMode = !debugMode;
    }
    
    gameState.getBall().setAcceleration(controlV.add(GRAV_EARTH));
}


function update(delta) {
    //TODO
    applyControls();
    var ball = gameState.getBall();
    ball.stepPosition();
    ball.collideBounds(gameState.getWorld());
    ball.stepVelocity();
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

window.onload = function() {
    // set up input listeners
	document.addEventListener("keydown", handleKeydown);
	document.addEventListener("keyup", handleKeyup);
	document.addEventListener("click", function() {
        var coinSound = new Audio("mariocoin.wav");
        gameState.changeCurrentCharacter();
        coinSound.play();
    });
	window.addEventListener("blur", handleBlur);
    
    //init game state
    gameState = new HutJumper.Model.GameState();
	
    // init renderer
    var canvas = document.getElementById('mainCanvas');
    renderer = new HutJumper.UI.Renderer(canvas);
    renderer.getCharacterTilesAsync(function main() {
        setInterval(function() {
            var time = new Date().getTime();
            var delta = (lastTime ? (lastTime - time) : 0);
            update(delta);
            renderer.render(gameState);
        }, 1000/FPS);
    });
}
