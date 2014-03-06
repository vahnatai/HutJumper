(function () {
    /**
     *  @namespace HutJumper.Engine
     */
    HutJumper.Engine = {};
    
    /**
     *  Controller class.
     */
     HutJumper.Engine.Controller = function Controller(document, canvas) {
        // set up input listeners
        var self = this;
        document.addEventListener("keydown", function(event) {
            self.handleKeydown(event);
        });
        document.addEventListener("keyup", function(event) {
            self.handleKeyup(event);
        });
        document.addEventListener("click", function(event) {
            var coinSound = new Audio("mariocoin.wav");
            coinSound.addEventListener('loadeddata', function() {
                coinSound.play();
            });
            self.gameState.changeCurrentCharacter();
        });
        window.addEventListener("blur", this.handleBlur);
        
        //init game state
        this.gameState = new HutJumper.Model.GameState();
        
        // init renderer
        this.renderer = new HutJumper.UI.Renderer(canvas);
        
        // mode for debug HUD (press i to toggle)
        this.debugMode = false;
        
        // last time model was updated
        this.lastTime = 0;
     };
     HutJumper.Engine.Controller.prototype = {
        CONTROL_FORCE: 1,
        JUMP_FORCE: 100,
        FRICTION_C: 0.15,
        RESTITUTION: 0.75,
        GRAV_EARTH: new HutJumper.Model.Vector(0, 9.81),

        KEYS: {
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
        },
     
        start: function start() {
            var self = this;
            this.renderer.getCharacterTilesAsync(function() {
                setInterval(function mainLoop() {
                    var time = new Date().getTime();
                    var delta = (self.lastTime ? (self.lastTime - time) : 0);
                    self.lastTime = time;
                    self.update(delta);
                    self.renderer.render(self.gameState, self.debugMode);
                }, 1000/self.renderer.FPS);
            });
        },
        
        handleKeyup: function handleKeyup(event) {
            //update which key is now not pressed
            for (k in this.KEYS) {
                var key = this.KEYS[k];
                if (event.keyCode === key.keycode) {
                    key.pressed = false;
                    break;
                }
            }
        },

        handleKeydown: function handleKeydown(event) {
            //update which key is now pressed
            for (k in this.KEYS) {
                var key = this.KEYS[k];
                if (event.keyCode === key.keycode) {
                    key.pressed = true;
                    break;
                }
            }
        },
        
        handleBlur: function handleBlur() {
            //no keys are pressed
            for (k in this.KEYS) {
                var key = this.KEYS[k];
                key.pressed = false;
            }
        },

        getCanvasX: function getCanvasX(event) {
            // Get the mouse position relative to the canvas element.
            if (typeof event.offsetX !== 'undefined') {
                return event.offsetX;
            } else if (typeof event.layerX !== 'undefined') { // Firefox
                var canvas = (event.srcElement ? event.srcElement : event.target);
                return event.layerX - canvas.offsetLeft;
            } 
            return null;
        },

        getCanvasY: function getCanvasY(event) {
            // Get the mouse position relative to the canvas element.
            if (typeof event.offsetY !== 'undefined') {
                return event.offsetY;
            } else if (typeof event.layerY !== 'undefined') { // Firefox
                var canvas = (event.srcElement ? event.srcElement : event.target);
                return event.layerY - canvas.offsetTop;
            } 
            return null;
        },

        applyControls: function applyControls() {
            var controlV = new HutJumper.Model.Vector(
                (this.KEYS.right.pressed - this.KEYS.left.pressed) * this.CONTROL_FORCE,
                (this.KEYS.down.pressed - this.KEYS.up.pressed) * this.CONTROL_FORCE);
            if (controlV.x < 0) {
                this.gameState.getBall().facingLeft = true;
            } else if (controlV.x > 0) {
                this.gameState.getBall().facingLeft = false;
            }
            
            if (this.KEYS.jump.pressed && this.gameState.getBall().isOnGround(this.gameState.getWorld())) {
                controlV = controlV.add(new HutJumper.Model.Vector(0, -this.JUMP_FORCE));
            }
            if (this.KEYS.info.pressed) {
                this.KEYS.info.pressed = false;//toggle on press, disable holding to toggle forever
                this.debugMode = !this.debugMode;
            }
            
            this.gameState.getBall().setAcceleration(controlV.add(this.GRAV_EARTH));
        },

        update: function update(delta) {
            //TODO
            this.applyControls();
            var ball = this.gameState.getBall();
            ball.stepPosition();
            ball.collideBounds(this.gameState.getWorld(), this.RESTITUTION);
            ball.stepVelocity(this.FRICTION_C);
        },
        
        exampleLoadJSON: function exampleLoadJSON() {
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
     };
})();