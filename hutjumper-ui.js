(function() {
    /**
     *  @namespace HutJumper.UI
     */
    HutJumper.UI = {};

    /**
     *  Renderer class.
     */
    HutJumper.UI.Renderer = function Renderer(canvas, camera){
        this.context = canvas.getContext("2d");
        this.camera = camera;
        this.charTiles = new Array();
        
        this.backgroundLayers = [
            this.loadImage("./bg-L0.png"),
            this.loadImage("./bg-L1.png"),
            this.loadImage("./bg-L2.png")
        ];
        this.fireball = this.loadImage("./fireball.png");//store this in a better way somewhere else with other images
        this.hut = this.loadImage("./hut.png");
        
    };
    HutJumper.UI.Renderer.prototype = {
        FPS: 60,
        BOUNDS_COLOR: "#111111",
        CANVAS_WIDTH: 800,
        CANVAS_HEIGHT: 600,
    
        /**
         *  Load the given URL as an image in memory.
         *
         *  @param url {string}     The image URL.
         */
        loadImage: function loadImage(url) {
            var image = new Image();
            image.src = url;
            return image;
        },

        /**
         *  Asynchronously load the character tiles.
         *
         *  @param callback {function}  To call on completion.
         */
        getCharacterTilesAsync: function getCharacterTilesAsync(callback) {
            var allTiles = new Array();
            var charTiles = this.charTiles;
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
            var promises = [];
            tilesetImage.onload = function() {   
                ctx.canvas.width = tilesetImage.width;
                ctx.canvas.height = tilesetImage.height;
                ctx.drawImage(tilesetImage, 0, 0);
                var tilesX = Math.floor(tilesetImage.width / (tileWidth + borderWidth));
                var tilesY = Math.floor(tilesetImage.height / (tileHeight + borderWidth));
                var totalTiles = tilesX * tilesY;
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
                    
                    var deferred = $.Deferred();
                    var tileImage = new Image();
                    tileImage.onload = function() {
                        deferred.resolve();
                    }
                    tileImage.src = tempCtx.canvas.toDataURL();
                    promises.push(deferred.promise());
                    allTiles.push(tileImage);
                  }
                }
                for (var i = 0; i < totalTiles; i += 4) {
                    charTiles.push(new HutJumper.UI.CharacterTiles(allTiles[i], allTiles[i+1], allTiles[i+2], allTiles[i+3]));
                }
                //wait for tile images to load, call callback
                $.when(promises).done(callback);
            }
            tilesetImage.src = "character_tiles.png";
        },
        
        /**
         *  Render the background layer to the canvas.
         *  TODO: parallax
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         */
        renderBackground: function renderBackground(context, gameState) {
            // round because pixels are discrete units; not rounding makes the image fuzzy
            var x = Math.round(this.camera.position.x + this.camera.width/2);
            var y = Math.round(this.camera.position.y + this.camera.height/2);
            
            // Static character, moving background
            // save,
            // translate before fill to offset the pattern,
            // then restore position
            
            // stars
            context.save();
            var parallaxX = Math.round(x/10);
            var parallaxY = Math.round(y/10);
            context.translate(-parallaxX, -parallaxY);
            context.fillStyle = context.createPattern(this.backgroundLayers[0], "repeat");
            context.fillRect(parallaxX, parallaxY, this.camera.width, this.camera.height);
            context.restore();
            
            //sea1
            var OFFSET = 30; //tuck this layer a bit under the next one
            var crestY = gameState.world.getMaxY() - (2 * this.backgroundLayers[1].height + this.backgroundLayers[2].height) + OFFSET;
            if (this.camera.containsY(crestY)) {
                parallaxX = Math.round(x/3);
                context.save();
                context.translate(-parallaxX, -y);
                context.fillStyle = context.createPattern(this.backgroundLayers[1], "repeat");
                context.fillRect(parallaxX, this.camera.worldYToCamera(crestY) + y,
                        this.CANVAS_WIDTH, this.backgroundLayers[1].height);
                context.restore();
            }
            
            //sea2
            crestY = gameState.world.getMaxY() - (this.backgroundLayers[1].height + this.backgroundLayers[2].height);
            if (this.camera.containsY(crestY)) {
                parallaxX = Math.round(x/2);
                context.save();
                context.translate(-parallaxX, -y);
                context.fillStyle = context.createPattern(this.backgroundLayers[1], "repeat");
                context.fillRect(parallaxX, crestY + this.camera.height/2,
                        this.CANVAS_WIDTH, this.backgroundLayers[1].height);
                context.restore();
            }
            
            //beach
            crestY = gameState.world.getMaxY() - this.backgroundLayers[2].height;
            if (this.camera.containsY(crestY)) {
                context.save();
                context.translate(-x, -y);
                context.fillStyle = context.createPattern(this.backgroundLayers[2], "repeat");
                context.fillRect(x, crestY + this.camera.height/2,
                        this.CANVAS_WIDTH, this.backgroundLayers[2].height);
                context.restore();
            }
        },

        /**
         *  Render the foreground layer to the canvas.
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         */
        renderForeground: function renderForeground(context, gameState) {
            var x = Math.round(this.camera.position.x + this.camera.width/2);
            var y = Math.round(this.camera.position.y + this.camera.height/2);
        
            //if they are visible from this position, render bounds
            var pc = gameState.getPC();
            var world = gameState.getWorld();
            if (this.camera.containsX(world.getMinX())) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(Math.round(this.camera.worldXToCamera(world.getMinX()) - this.camera.width/2),
                        0, Math.round(this.camera.width/2), this.camera.height);
            }
            if (this.camera.containsX(world.getMaxX())) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(Math.round(this.camera.worldXToCamera(world.getMaxX())),
                        0, Math.round(this.camera.width/2), this.camera.height);
            }
            if (this.camera.containsY(world.getMinY())) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(0, Math.round(this.camera.worldYToCamera(world.getMinY()) - this.camera.height/2),
                        this.camera.width, this.camera.height/2);
            }
            if (this.camera.containsY(world.getMaxY())) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(0, Math.round(this.camera.worldYToCamera(world.getMaxY())),
                        this.camera.width, this.camera.height/2);
            }
        },
        
        /**
         *  Render all visible entities to the canvas.
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         */
        renderEntities: function renderEntities(context, gameState) {
            this.renderPC(context, gameState);
            var pc = gameState.getPC();
            var ents = gameState.getEntities();
            ents.splice(ents.indexOf(pc), 1);
            for (var i in ents) {
                var entity = ents[i];
                var image = this.getImageByTypeId(entity.typeId);
                if ( (this.camera.containsX(entity.position.x + entity.radius) || this.camera.containsX(entity.position.x - entity.radius))
                        && (this.camera.containsY(entity.position.y + entity.radius) || this.camera.containsY(entity.position.y - entity.radius))) {
                    var cameraPos = this.camera.worldToCamera(entity.position);
                    context.drawImage(image, cameraPos.x - entity.radius, cameraPos.y - entity.radius, image.width, image.height);
                }
            }
        },

        /**
         *  Render the player character to the canvas.
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         */
        renderPC: function renderPC(context, gameState) {
            //static char, moving bg
            var pc = gameState.getPC();
            var world = gameState.getWorld();
            var tiles = this.charTiles[gameState.getCurrentCharacter()];
            var currentFrame;
            
            var position;
            if (pc.facingLeft) {
                position = "left";
            } else {
                position = "right";
            }
            
            if (!pc.isOnGround(world) || (pc.position.x % 100) < 50) {
                position += "Walk";
            }
            currentFrame = tiles[position];
            var cameraPos = this.camera.worldToCamera(pc.position);
            context.drawImage(currentFrame, Math.round(cameraPos.x - currentFrame.width/2), Math.round(cameraPos.y - currentFrame.height/2), currentFrame.width, currentFrame.height);
        },

        /**
         *  Render the heads-up display layer to the canvas.
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         *  @param debugMode {boolean}          Debug flag.
         */
        renderHUD: function renderHUD(context, gameState, debugMode) {
            var pc = gameState.getPC();
            if (debugMode) {
                var x = Math.round(pc.position.x);
                var y = Math.round(pc.position.y);
                var velX = Math.round(pc.velocity.x);
                var velY = Math.round(pc.velocity.y);
                var accX = Math.round(pc.acceleration.x);
                var accY = Math.round(pc.acceleration.y);
                
                context.save();
                context.font = "20px Arial";
                context.globalAlpha = 0.7;
                context.fillStyle = "#FFFFFF";
                context.fillText("x: " + x + ", y: " + y, 20, 20);
                context.fillText("velX: " + velX + ", velY: " + velY, 20, 50);
                context.fillText("accX: " + accX + ", accY: " + accY, 20, 80);
                context.restore();
            }
        },

        
        /**
         *  Render the game state to the canvas.
         *
         *  @param gameState {GameState}        State to render.
         *  @param debugMode {boolean}          Debug flag.
         */
        render: function render(gameState, debugMode) {
            this.camera.update();
            this.renderBackground(this.context, gameState);
            this.renderForeground(this.context, gameState);
            this.renderEntities(this.context, gameState);
            this.renderHUD(this.context, gameState, debugMode);
            //TODO
        },
        
        getImageByTypeId: function getImageByTypeId(typeId) {
            if (typeId === 'fireball') {
                return this.fireball;
            } else if (typeId === 'hut') {
                return this.hut;
            } else {
                return null;
            }
        },
        
        /**
         *  Convert world-relative coordinates to camera-relative coordinates.
         *
         *  TODO delete this copy of the function and use Camera.worldToCamera
         *  instead.
         */
        worldToCamera: function worldToCamera(gameState, worldPos) {
            var cameraPos = worldPos.subtract(gameState.pc.position);
            cameraPos.x += this.CANVAS_WIDTH/2;
            cameraPos.y += this.CANVAS_HEIGHT/2;
            return cameraPos;
        }
    };
    
    /**
     *  Camera class.
     */
    HutJumper.UI.Camera = function Camera(world, x, y, width, height) {
        this.world = world;
        this.position = new HutJumper.Model.Vector(x, y); //top left corner of view
        this.width = width;
        this.height = height;
    }
    HutJumper.UI.Camera.prototype = {
        /**
         *  Called on the Camera once per tick. Override to
         *  update camera attributes.
         */
        update: function update() {
            //implement me to update coordinates per-tick
        },
        
        //TODO IMPLEMENT AND COMMENT
        containsX: function containsX(x) {
            return (x > this.position.x) && (x < this.position.x + this.width);
        },
        containsY: function containsY(y) {
            return (y > this.position.y) && (y < this.position.y + this.height);
        },
        containsPoint: function containsPoint(position) {
            return this.containsX(position.x) && this.containsY(position.y);
        },
    
        /**
         *  Convert world-relative coordinates to camera-relative coordinates.
         */
        worldToCamera: function worldToCamera(worldPos) {
            return worldPos.subtract(this.position);
        },
        
        worldXToCamera: function worldToCamera(worldX) {
            return worldX - this.position.x;
        },
        
        worldYToCamera: function worldToCamera(worldY) {
            return worldY - this.position.y;
        },
        
        /**
         *  Get the center point of this camera's view, in world coordinates.
         */
        getCenter: function getCenterInWorld() {
            return new HutJumper.Model.Vector(
                    Math.round(this.position.x + this.width/2),
                    Math.round(this.position.y + this.height/2)
                );
        }
    };
    
    /**
     *  EntityCamera class.
     */
     HutJumper.UI.EntityCamera = function EntityCamera(entity, width, height) {
        this._super.call(this, entity.world, Math.round(entity.position.x - width/2), Math.round(entity.position.y - height/2), width, height);
        this.entity = entity;
     };
     extend(HutJumper.UI.Camera, HutJumper.UI.EntityCamera, {
        /**
         *  Follow the entity.
         */
        update: function update() {
            this.position.x = Math.max(this.world.getMinX(), Math.min(this.entity.position.x, this.world.getMaxX() - this.width/2) - this.width/2);
            this.position.y = Math.max(this.world.getMinY(), Math.min(this.entity.position.y, this.world.getMaxY() - this.height/2) - this.height/2);
        }
     });
     
     
     
    /**
     *  CharacterTiles class.
     */
    HutJumper.UI.CharacterTiles = function CharacterTiles(left, leftWalk, rightWalk, right) {
        this.left = left;
        this.leftWalk = leftWalk;
        this.right = right;
        this.rightWalk = rightWalk;
    };
})();
