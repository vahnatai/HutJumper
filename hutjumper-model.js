(function() {
    /**
     *  @namespace HutJumper.Model
     */
    HutJumper.Model = {}

    /**
     *   Vector class.
     */
    HutJumper.Model.Vector = function Vector(x, y) {
        //default parameter values 
        if (!x){
            x = 0;
        }
        if (!y){
            y = 0;
        }
        
        this.x = x;
        this.y = y;
    }
    HutJumper.Model.Vector.prototype = {
        getLength: function() {
            return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        },
        normalized: function() {
            var length = this.getLength();
            var x = this.x / length;
            var y = this.y / length;
            return new HutJumper.Model.Vector(x, y);
        },
        add: function(that) {
            var x = this.x + that.x;
            var y = this.y + that.y;
            return new HutJumper.Model.Vector(x, y);
        },
        subtract: function(that) {
            var x = this.x - that.x;
            var y = this.y - that.y;
            return new HutJumper.Model.Vector(x, y);
        },
        dotProduct: function(that) {
            return ( (this.x * that.x) + (this.y * that.y) );
        },
        multiplyScalar: function(scalar) {
            var x = (this.x * scalar);
            var y = (this.y * scalar);
            return new HutJumper.Model.Vector(x, y);
        }
    };

    /**
     * Ball Class
     */
    HutJumper.Model.Ball = function Ball(x, y, radius, color) {
        if (!color) {
            color = "#000000";
        }
        
        this.position = new HutJumper.Model.Vector(x,y);
        this.velocity = new HutJumper.Model.Vector();
        this.acceleration = new HutJumper.Model.Vector();
        
        this.radius = radius;
        //TODO make these matter!
        this.width = 18;
        this.height = 38;
        this.facingLeft = true;
        this.color = color;
    }
    HutJumper.Model.Ball.prototype = {
        //class-level constants
        mass: 1,
        
        //Ball functions
        setAcceleration: function(accel) {
            this.acceleration = accel;
        },
        
        stepVelocity: function(friction) {
            var changed = false;
            var friction = this.velocity.multiplyScalar(friction);
            
            this.velocity = this.velocity.add(this.acceleration).subtract(friction);
        },
        
        /**
         * XXX maybe this function should be moved out of the ball class,
         * to World or some game logic elsewhere?
         */
        stepPosition: function() {
            var changed = false;
            if (this.velocity.getLength()) {
                //XXX
                this.position = this.position.add(this.velocity);
            }
        },
        
        isOnGround: function(world) {
            return this.position.y + this.radius >= world.getMaxY();
        },
        
        isColliding: function(that) {
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
        },
        
        collide: function(that, restitution) {
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
        },
        
        collideBounds: function(world, restitution) {
            var minX = world.getMinX();
            var maxX = world.getMaxX();
            var minY = world.getMinY();
            var maxY = world.getMaxY();
        
            if ((this.position.x - this.radius <= minX) 
                    && (this.velocity.x < 0)) { 
                this.velocity.x = -this.velocity.x * restitution;
                this.position.x = minX + this.radius; 
            } else if ((this.position.x + this.radius >= maxX)
                    && (this.velocity.x > 0) ) {
                this.velocity.x = -this.velocity.x * restitution;
                this.position.x = maxX - this.radius;
            }
            if (this.position.y - this.radius <= minY
                    && (this.velocity.y < 0) ) {
                this.velocity.y = -this.velocity.y * restitution;
                this.position.y = minY + this.radius;
            } else if (this.position.y + this.radius >= maxY
                    && (this.velocity.y > 0) ) {
                this.velocity.y = -this.velocity.y * restitution;
                this.position.y = maxY - this.radius;
            }
        }
    };

    /**
     *  World class.
     */
    HutJumper.Model.World = function World() {
    }
    HutJumper.Model.World.prototype = {
        //class-level constants
        CELL_WIDTH_PX: 50,
        CELL_HEIGHT_PX: 50,
        
        data: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]
        ],
        
        // class functions
        getMinX: function() {
            return 0;
        },
        getMaxX: function() {
            return this.data[0].length * this.CELL_WIDTH_PX;
        },
        getMinY: function() {
            return 0;
        },
        getMaxY: function() {
            return this.data.length * this.CELL_WIDTH_PX;
        },
        worldToCell: function(worldCoords) {
            return worldCoords.multiplyScalar(this.CELL_WIDTH_PX);
        },
        cellToWorld: function(cellCoords) {
            return worldCoords.multiplyScalar(1/this.CELL_WIDTH_PX);
        }
    }
    
    /**
     *  GameState class.
     */
    HutJumper.Model.GameState = function GameState() {
        this.world = new HutJumper.Model.World();
        this.ball = new HutJumper.Model.Ball(15, 15, 19, "#FF0000");
        this.selectedChar = 0;
    }
    HutJumper.Model.GameState.prototype = {
        NUM_CHARACTERS: 3,
    
        getBall: function getBall() {
            return this.ball;
        },
        
        getWorld: function getWorld() {
            return this.world;
        },
        
        getCurrentCharacter: function getCurrentCharacter() {
            return this.selectedChar;
        },
        
        changeCurrentCharacter: function changeCurrentCharacter() {
            this.selectedChar = (this.selectedChar + 1) % this.NUM_CHARACTERS;
        }
    }
})();
