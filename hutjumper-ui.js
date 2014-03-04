(function () {
    /**
     *  @namespace HutJumper.UI
     */
    HutJumper.UI = {};

    /**
     *  Renderer class.
     */
    HutJumper.UI.Renderer = function (canvas){
        this.context = canvas.getContext("2d");
        this.charTiles = new Array();
    };
    HutJumper.UI.Renderer.prototype = {
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
            var promises = [];
            
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
        },
        
        renderBackground: function renderBackground(context, gameState) {
            // round because pixels are discrete units; not rounding makes the image fuzzy
            var x = Math.round(gameState.getBall().position.x);
            var y = Math.round(gameState.getBall().position.y);
            // static char, moving bg
            // translate before fill to offset the pattern,
            // then restore position
            context.save();
            context.fillStyle = context.createPattern(BACKGROUND_TILE, "repeat");
            context.translate(-x, -y);
            context.fillRect(x, y, CANVAS_WIDTH, CANVAS_HEIGHT);
            context.restore();
        },

        renderForeground: function renderForeground(context, gameState) {
            //if they are visible from this position, render bounds
            var ball = gameState.getBall();
            var world = gameState.getWorld();
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
        },

        renderBall: function renderBall(context, gameState) {
            //static char, moving bg
            var ball = gameState.getBall();
            var world = gameState.getWorld();
            var tiles = this.charTiles[gameState.getCurrentCharacter()];
            var currentFrame;
            
            var position;
            if (ball.facingLeft) {
                position = "left";
            } else {
                position = "right";
            }
            
            if (!ball.isOnGround(world) || (ball.position.x % 100) < 50) {
                position += "Walk";
            }
            currentFrame = tiles[position];
            context.drawImage(currentFrame, CANVAS_WIDTH/2 - currentFrame.width/2, CANVAS_HEIGHT/2 - currentFrame.height/2, currentFrame.width, currentFrame.height);
        },

        renderHUD: function renderHUD(context, gameState) {
            var ball = gameState.getBall();
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
        },

        render: function render(gameState) {
            this.renderBackground(this.context, gameState);
            this.renderForeground(this.context, gameState);
            this.renderBall(this.context, gameState);
            this.renderHUD(this.context, gameState);
            //TODO
        }
    };
    
    /**
     *  CharacterTiles Class
     */
    HutJumper.UI.CharacterTiles = function(left, leftWalk, rightWalk, right) {
        this.left = left;
        this.leftWalk = leftWalk;
        this.right = right;
        this.rightWalk = rightWalk;
    };
    HutJumper.UI.CharacterTiles.prototype = {};
})();
