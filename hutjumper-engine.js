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
            //update which key is now pressed
            for (k in self.KEYS) {
                var key = self.KEYS[k];
                if (event.keyCode === key.keycode) {
                    key.pressed = true;
                    break;
                }
            }
        });
        document.addEventListener("keyup", function(event) {
            //update which key is now not pressed
            for (k in self.KEYS) {
                var key = self.KEYS[k];
                if (event.keyCode === key.keycode) {
                    key.pressed = false;
                    break;
                }
            }
        });
        window.addEventListener("blur", function(event) {
            //if game loses focus, reset all keys
            for (k in self.KEYS) {
                var key = self.KEYS[k];
                key.pressed = false;
            }
        });
        canvas.addEventListener("mouseup", function(event) {
            if (self.getMouseButton(event) === 2) {
                var coinSound = new Audio("mariocoin.wav");
                coinSound.addEventListener('loadeddata', function() {
                    coinSound.play();
                });
                self.gameState.changeCurrentCharacter();
            }
        });
        canvas.oncontextmenu = function(event) {
            return false;//prevent default menu on canvas
        };
        
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

        /*
         * TODO make a ControlKey(?) class, replace KEYS with an 
         * object created in constructor instead of in the prototype
         */
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
     
        /**
         *  Begin execution of the main game interval, which
         *  updates the model and renders to the canvas.
         */
        start: function start() {
            var self = this;
            var setupGameInterval = function() {
                setInterval(function () {
                    var time = new Date().getTime();
                    var delta = (self.lastTime ? (self.lastTime - time) : 0);
                    self.lastTime = time;
                    self.update(delta);
                    self.renderer.render(self.gameState, self.debugMode);
                }, 1000/self.renderer.FPS);
            }
            this.renderer.getCharacterTilesAsync(setupGameInterval);
        },

        /**
         *  Gets the canvas X coordinate of the given mouse event.
         */
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

        /**
         *  Gets the canvas Y coordinate of the given mouse event.
         */
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
        
        /**
         *  Gets the pressed button from the given relevant mouse event.
         */
        getMouseButton: function getMouseButton(event) {
            if (typeof event.which !== 'undefined') {
                return event.which - 1;
            }
            if (typeof event.button !== 'undefined') {
                return event.button;
            }
        },

        /**
         *  In a given game tick, applies any active controls to the model.
         */
        applyControls: function applyControls() {
            var controlV = new HutJumper.Model.Vector(
                (this.KEYS.right.pressed - this.KEYS.left.pressed) * this.CONTROL_FORCE,
                (this.KEYS.down.pressed - this.KEYS.up.pressed) * this.CONTROL_FORCE);
            if (controlV.x < 0) {
                this.gameState.getPC().facingLeft = true;
            } else if (controlV.x > 0) {
                this.gameState.getPC().facingLeft = false;
            }
            
            if (this.KEYS.jump.pressed && this.gameState.getPC().isOnGround(this.gameState.getWorld())) {
                controlV = controlV.add(new HutJumper.Model.Vector(0, -this.JUMP_FORCE));
            }
            if (this.KEYS.info.pressed) {
                this.KEYS.info.pressed = false;//toggle on press, disable holding to toggle forever
                this.debugMode = !this.debugMode;
            }
            
            this.gameState.getPC().setAcceleration(controlV.add(this.GRAV_EARTH));
        },

        /**
         *  Update game state based on Entity positions, velocities, and accelerations.
         */
        update: function update(delta) {
            //TODO
            this.applyControls();
            var pc = this.gameState.getPC();
            pc.stepPosition();
            pc.collideBounds(this.gameState.getWorld(), this.RESTITUTION);
            pc.stepVelocity(this.FRICTION_C);
        },
        
        // XXX just an example
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
                    //TODO something with JSON.parse(request.responseText)
                }
            }
            request.open("GET", "ajax_info.txt", true);
            request.send();
        }
     };
})();