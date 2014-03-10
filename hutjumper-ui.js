(function() {
    /**
     *  @namespace HutJumper.UI
     */
    HutJumper.UI = {};

    /**
     *  Renderer class.
     */
    HutJumper.UI.Renderer = function Renderer(canvas){
        this.context = canvas.getContext("2d");
        this.charTiles = new Array();
        
        this.backgroundTile = this.loadImage("./grass.png");
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
            var x = Math.round(gameState.getPC().position.x);
            var y = Math.round(gameState.getPC().position.y);
            // static char, moving bg
            // translate before fill to offset the pattern,
            // then restore position
            context.save();
            context.fillStyle = context.createPattern(this.backgroundTile, "repeat");
            context.translate(-x, -y);
            context.fillRect(x, y, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);
            context.restore();
        },

        /**
         *  Render the foreground layer to the canvas.
         *
         *  @param context {canvas 2d context}  Context to render to.
         *  @param gameState {GameState}        State to render.
         */
        renderForeground: function renderForeground(context, gameState) {
            //if they are visible from this position, render bounds
            var pc = gameState.getPC();
            var world = gameState.getWorld();
            if (pc.position.x - this.CANVAS_WIDTH/2 <= world.getMinX()) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(world.getMinX() - pc.position.x, 0, this.CANVAS_WIDTH/2, this.CANVAS_HEIGHT);
            }
            if (pc.position.x + this.CANVAS_WIDTH/2 >= world.getMaxX()) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(world.getMaxX() - pc.position.x + this.CANVAS_WIDTH/2, 0, this.CANVAS_WIDTH/2, this.CANVAS_HEIGHT);
            }
            if (pc.position.y - this.CANVAS_HEIGHT/2 <= world.getMinY()) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(0, world.getMinY() - pc.position.y, this.CANVAS_WIDTH, this.CANVAS_HEIGHT/2);
            }
            if (pc.position.y + this.CANVAS_WIDTH/2 >= world.getMaxY()) {
                context.fillStyle = this.BOUNDS_COLOR;
                context.fillRect(0, world.getMaxY() - pc.position.y + this.CANVAS_HEIGHT/2, this.CANVAS_WIDTH, this.CANVAS_HEIGHT/2);
            }
        },

        /**
         *  Render the entity to the canvas.
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
            context.drawImage(currentFrame, this.CANVAS_WIDTH/2 - currentFrame.width/2, this.CANVAS_HEIGHT/2 - currentFrame.height/2, currentFrame.width, currentFrame.height);
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
            this.renderBackground(this.context, gameState);
            this.renderForeground(this.context, gameState);
            this.renderPC(this.context, gameState);
            this.renderHUD(this.context, gameState, debugMode);
            //TODO
        }
    };
    
    /**
     *  CharacterTiles Class
     */
    HutJumper.UI.CharacterTiles = function CharacterTiles(left, leftWalk, rightWalk, right) {
        this.left = left;
        this.leftWalk = leftWalk;
        this.right = right;
        this.rightWalk = rightWalk;
    };
    HutJumper.UI.CharacterTiles.prototype = {};
})();
