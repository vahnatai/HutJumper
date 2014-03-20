(function () {
    /**
     *  @namespace HutJumper.Engine
     */
    HutJumper.Engine = {};
    
    /**
     *  ControlKey class.
     */
    HutJumper.Engine.ControlKey = function ControlKey(keycode) {
        this.keycode = keycode;
        this.pressed = false;
    }
    HutJumper.Engine.ControlKey.prototype = {};
    
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
            if (self.getMouseButton(event) === 0) {
                var pc = self.gameState.getPC();
                var sign = (pc.facingLeft ? -1 : 1);
                var projectile = new HutJumper.Model.Projectile('fireball', self.gameState.getWorld(), pc,
                        pc.position.x, pc.position.y - 30, 16, new HutJumper.Model.Vector(sign*20, -10).add(pc.velocity), 500);
                projectile.setAcceleration(self.GRAV_EARTH);
                self.gameState.addEntity(projectile);
            }
            if (self.getMouseButton(event) === 2) {
                self.playAudio(self.AUDIO_COIN);
                self.gameState.changeCurrentCharacter();
            }
        });
        canvas.oncontextmenu = function(event) {
            return false;//prevent default menu on canvas
        };
        
        //init game state
        this.gameState = new HutJumper.Model.GameState(this.GRAV_EARTH);
        
        // init renderer
        this.renderer = new HutJumper.UI.Renderer(canvas);
        
        // mode for debug HUD (press i to toggle)
        this.debugMode = false;
        
        // last time model was updated
        this.lastTime = 0;
        
        
        
        this.KEYS = {
            up: new HutJumper.Engine.ControlKey(87),        //W
            down: new HutJumper.Engine.ControlKey(83),      //S
            left:  new HutJumper.Engine.ControlKey(65),     //A
            right:  new HutJumper.Engine.ControlKey(68),    //D
            jump:  new HutJumper.Engine.ControlKey(32),     //SPACE
            info:  new HutJumper.Engine.ControlKey(73)      //I
        };
        
     };
     HutJumper.Engine.Controller.prototype = {
        CONTROL_FORCE: 1,
        FRICTION_C: 0.15,
        RESTITUTION: 0.75,
        GRAV_EARTH: new HutJumper.Model.Vector(0, 9.81),
        
        AUDIO_COIN: new Audio('mariocoin.wav'),
     
        /**
         *  Begin execution of the main game interval, which
         *  updates the model and renders to the canvas.
         */
        start: function start() {
            var self = this;
            var frameRate = 1000/self.renderer.FPS; // rendering rate in milliseconds
            var dt = 10; // fixed simulation chunk size in milliseconds
            var accumulator = 0; // store remaining miliseconds (< dt) to simulate after next frame
            var setupGameInterval = function() {
                setInterval(function() {
                    var time = new Date().getTime();
                    var frameTime = (self.lastTime ? (time - self.lastTime) : 0);
                    self.lastTime = time;
                    accumulator += frameTime;
                    
                    // simulate what time has passed in dt-sized chunks, leave remainder for next time
                    while (accumulator >= dt) {
                        self.update(dt);
                        accumulator -= dt;
                    }
                    
                    //TODO render state ahead by accumulator value to eliminate temporal aliasing?
                    //see: (http://gafferongames.com/game-physics/fix-your-timestep/)
                    self.renderer.render(self.gameState, self.debugMode);
                }, frameRate);
            }
            this.renderer.getCharacterTilesAsync(setupGameInterval);
        },

        /**
         *  Gets the canvas X coordinate of the given mouse event.
         *
         *  @param event {MouseEvent}
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
         *
         *  @param event {MouseEvent}
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
         *
         *  @param event {MouseEvent}
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
            var pc = this.gameState.getPC();
            var controlV = new HutJumper.Model.Vector(
                (this.KEYS.right.pressed - this.KEYS.left.pressed) * this.CONTROL_FORCE,
                (this.KEYS.down.pressed - this.KEYS.up.pressed) * this.CONTROL_FORCE);
            if (controlV.x < 0) {
                pc.facingLeft = true;
            } else if (controlV.x > 0) {
                pc.facingLeft = false;
            }
            
            if (this.KEYS.jump.pressed && pc.isOnGround(this.gameState.getWorld()) && !pc.isJumping()) {
                pc.startJump();
            } else if (!this.KEYS.jump.pressed && pc.isJumping()) {
                pc.stopJump();
            }
            if (this.KEYS.info.pressed) {
                this.KEYS.info.pressed = false;//toggle on press, disable holding to toggle forever
                this.debugMode = !this.debugMode;
            }
            pc.setAcceleration(this.GRAV_EARTH.add(controlV));
        },

        /**
         *  Update game state based on Entity positions, velocities, accelerations,
         *  and the time since the last update.
         *  
         *  @param deltaTime {number}   Time(in milliseconds) since the last update.
         */
        update: function update(deltaTime) {
            //TODO
            this.applyControls();
            var pc = this.gameState.getPC();
            var ents = this.gameState.getEntities();
            
            //clean up expired entities
            for (var i in ents) {
                var ent = ents[i];
                if (ent.isExpired()) {
                    this.gameState.removeEntity(ent);
                }
            }
            ents = this.gameState.getEntities();
            for (var i in ents) {
                var ent = ents[i];
                
                ent.stepPosition(deltaTime);
                ent.collideBounds(this.gameState.getWorld(), this.RESTITUTION, deltaTime);
                ent.stepVelocity(this.FRICTION_C, deltaTime);
            }
            
        },
        
        /**
         *  Play a copy of the given Audio object on its own channel.
         *
         *  @param audio {Audio}    The Audio object to play.
         *  @returns {Audio}        The copy, ie: the Audio object that is actually playing now.
         */
        playAudio: function playAudio(audio){
            var newAudio = audio.cloneNode();
            newAudio.play();
            return newAudio;
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