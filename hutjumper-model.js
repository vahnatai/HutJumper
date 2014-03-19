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
        /**
         *  Returns the scalar length of this Vector.
         *
         *  @returns {number}   Vector length.
         */
        getLength: function() {
            return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
        },
        
        /**
         *  Returns a Vector with the same direction as this Vector,
         *  but with a length of 1.
         *
         *  @returns {Vector}   Normalized Vector.
         */
        normalized: function() {
            var length = this.getLength();
            var x = this.x / length;
            var y = this.y / length;
            return new HutJumper.Model.Vector(x, y);
        },
        
        /**
         *  Returns a new Vector which is the sum of this Vector and
         *  the given Vector.
         *
         *  @param that {Vector}    The vector to add to this Vector.
         *  @returns {Vector}       The Vector sum.
         */
        add: function(that) {
            var x = this.x + that.x;
            var y = this.y + that.y;
            return new HutJumper.Model.Vector(x, y);
        },
        
        /**
         *  Returns a new Vector which is the difference of this Vector
         *  and the given Vector.
         *
         *  @param {Vector} that    The vector to subtract from this Vector.
         *  @returns {Vector}       The Vector difference.
         */
        subtract: function(that) {
            var x = this.x - that.x;
            var y = this.y - that.y;
            return new HutJumper.Model.Vector(x, y);
        },
        
        /**
         *  Returns a new Vector which is the dot product (the sum of 
         *  the products of corresponding entries) of this Vector and
         *  the given Vector.
         *
         *  @param {Vector} that    The vector to multiply into this Vector.
         *  @returns {number}       The Vector dot product.
         */
        dotProduct: function(that) {
            return ( (this.x * that.x) + (this.y * that.y) );
        },
        
        /**
         *  Returns a new Vector which is the product of this Vector and
         *  the given scalar.
         *
         *  @param {number} that    The scalar to multiply into this Vector.
         *  @returns {Vector}       The product.
         */
        multiplyScalar: function(scalar) {
            var x = (this.x * scalar);
            var y = (this.y * scalar);
            return new HutJumper.Model.Vector(x, y);
        }
    };

    /**
     * Entity Class
     */
    HutJumper.Model.Entity = function Entity(typeId, world, x, y, radius) {
        this.typeId = typeId;
        this.world = world;
        this.position = new HutJumper.Model.Vector(x,y);
        this.velocity = new HutJumper.Model.Vector();
        this.acceleration = new HutJumper.Model.Vector();
        this.facingLeft = true;
        this.expired = false;
        this.jumping = false;
        this.jumpTime = 0;
        
        this.radius = radius;
        //TODO make these matter!
        this.width = 18;
        this.height = 38;
    }
    HutJumper.Model.Entity.prototype = {
        mass: 1,
        JUMP_FORCE: 25,
        
        /**
         *  Sets the acceleration of this entity.
         *  
         *  @param {Vector} accel   The new acceleration.
         */
        setAcceleration: function(accel) {
            this.acceleration = accel;
        },
        
        /**
         *  Simulates the velocity of this entity.
         *  
         *  @param {number} friction   Friction of movement.
         */
        stepVelocity: function(friction, delta) {
            var changed = false;
            var friction = this.velocity.multiplyScalar(friction);
            
            this.velocity = this.velocity.add(this.acceleration).subtract(friction).add(this.world.gravity);
            if (this.jumpTime > 0) {
                this.velocity = this.velocity.add(new HutJumper.Model.Vector(0, -this.JUMP_FORCE));
            }
        },
        
        /*
         * XXX maybe these functions should be moved out of the Entity class,
         * to World or some game logic elsewhere?
         */
         
        /**
         *  Sets the position of this entity forward a step.
         */
        stepPosition: function(delta) {
            var changed = false;
            if (this.velocity.getLength()) {
                //XXX
                this.position = this.position.add(this.velocity);
            }
            if (this.jumpTime > 0) {
                this.jumpTime -= delta;
            }
        },
        
        /**
         *  Returns true if the entity is standing on solid 
         *  ground in the given World, false otherwise.
         *
         *  @param {World} world    The world to check against.
         *  @returns {boolean}      The status of the Entity's groundedness.
         */
        isOnGround: function(world) {
            return this.position.y + this.radius >= world.getMaxY();
        },
        
        /**
         *  Returns true if the entity is currently colliding
         *  with the given Entity, false otherwise.
         *
         *  @param {Entity} that    The collision candidate.
         *  @returns {boolean}      The collision status of the two Entities.
         */
        isColliding: function(that) {
            if (!(that instanceof Entity)) {
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
        
        /**
         *  Model physical collision of the given Entity with
         *  this one, adjusting position and velocity.
         *
         *  @param {Entity} that            The other Entity.
         *  @param {number} restitution     The coefficient of restitution.
         */
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
            var i = (-(1.0 + restitution) * vn) / (im1 + im2);
            var impulse = mtd.normalized().multiplyScalar(i);

            // change in momentum
            this.velocity = this.velocity.add(impulse.multiplyScalar(im1));
            that.velocity = that.velocity.subtract(impulse.multiplyScalar(im2));
        },
        
        /**
         *  Model physical collision of this Entity with the
         *  given World's bounds, adjusting position and velocity.
         *
         *  @param {World} world        The world to collide with, if needed.
         *  @param {number} restitution The coefficient of restitution.
         *  @param deltaTime {number}   Time(in milliseconds) since the last update.
         */
        collideBounds: function(world, restitution, deltaTime) {
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
        },
        
        /**
         *  Mark this Entity to be removed.
         */
        expire: function expire() {
            this.expired = true;
        },
        
        /**
         *  Check if Entity is marked for removal.
         */
        isExpired: function isExpired() {
            return this.expired;
        },
        
        /**
         *  Check if Entity is currently jumping.
         */
        isJumping: function isJumping() {
            return this.jumping;
        },
        
        /**
         *  Begins jumping from this location.
         */
        startJump: function startJump() {
            if (this.jumpTime <= 0) {
                this.jumpTime = 200;
            }
            this.jumping = true;
        },
        
        /**
         *  Ceases any jump force on this entity.
         */
        stopJump: function stopJump() {
            this.jumpTime = 0;
            this.jumping = false;
        }
    };
    
    /**
     *  Projectile class.
     *
     *  @extends {Entity}
     */
     HutJumper.Model.Projectile = function Projectile(typeId, world, source, x, y, radius, velocity, lifeTime) {
        HutJumper.Model.Entity.call(this, typeId, world, x, y, radius);
        this.velocity = velocity;
        this.source = source;
        this.lifeTime = lifeTime;
     };
     extend(HutJumper.Model.Entity, HutJumper.Model.Projectile, {
     
        /**
         *  Updates expiration based on lifeTime.
         */
        stepPosition: function stepPosition(delta) {
            HutJumper.Model.Entity.prototype.stepPosition.call(this, delta);
            if (this.lifeTime > 0) {
                this.lifeTime -= delta;
            } else {
                this.expire();
            }
        }
     });
     
     

    /**
     *  World class.
     */
    HutJumper.Model.World = function World(gravity) {
        this.gravity = gravity;
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
        
        /**
         *  Get the minimum X value for this World.
         */
        getMinX: function() {
            return 0;
        },
        
        /**
         *  Get the maximum X value for this World.
         */
        getMaxX: function() {
            return this.data[0].length * this.CELL_WIDTH_PX;
        },
        
        /**
         *  Get the minimum Y value for this World.
         */
        getMinY: function() {
            return 0;
        },
        
        /**
         *  Get the maximum Y value for this World.
         */
        getMaxY: function() {
            return this.data.length * this.CELL_WIDTH_PX;
        },
        
        /**
         *  Convert the given in-world coordinates into cell coordinates.
         */
        worldToCell: function(worldCoords) {
            return worldCoords.multiplyScalar(this.CELL_WIDTH_PX);
        },
        
        /**
         *  Convert the given cell coordinates into in-world coordinates.
         */
        cellToWorld: function(cellCoords) {
            return worldCoords.multiplyScalar(1/this.CELL_WIDTH_PX);
        }
    }
    
    /**
     *  GameState class.
     */
    HutJumper.Model.GameState = function GameState(gravity) {
        this.world = new HutJumper.Model.World(gravity);
        this.pc = new HutJumper.Model.Entity('pc', this.world, 15, 15, 19);
        this.entities = [this.pc];
        this.selectedChar = 0;
    }
    HutJumper.Model.GameState.prototype = {
        NUM_CHARACTERS: 3,
    
        /**
         *  Returns the player character Entity.
         *
         *  @returns {Entity}
         */
        getPC: function getPC() {
            return this.pc;
        },
        
        /**
         *  Returns all Entities.
         *
         *  @returns {Entity[]}
         */
        getEntities: function getEntities() {
            return this.entities.slice(0);
        },
        
        /**
         *  Adds the given entity to the GameState.
         *
         *  @param entity {Entity}
         */
        addEntity: function addEntity(entity) {
            this.entities.push(entity);
        },
        
        /**
         *  Removes the given entity from the GameState.
         *
         *  @param entity {Entity}
         */
        removeEntity: function removeEntity(entity) {
            this.entities.splice(this.entities.indexOf(entity), 1);
        },
        
        /**
         *  Returns the current World.
         */
        getWorld: function getWorld() {
            return this.world;
        },
        
        /**
         *  Returns the index of the currently selected player character.
         *  TODO make this work better later
         */
        getCurrentCharacter: function getCurrentCharacter() {
            return this.selectedChar;
        },
        
        /**
         *  Increments the index of the currently selected player character.
         *  TODO make this work better later
         */
        changeCurrentCharacter: function changeCurrentCharacter() {
            this.selectedChar = (this.selectedChar + 1) % this.NUM_CHARACTERS;
        }
    }
})();
