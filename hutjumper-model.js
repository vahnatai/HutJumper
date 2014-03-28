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
    HutJumper.Model.Entity = function Entity(typeId, world, shape, velocity) {
        this.typeId = typeId;
        this.world = world;
        this.position = shape.position;
        this.velocity = valueOrDefault(velocity, new HutJumper.Model.Vector());
        this.acceleration = new HutJumper.Model.Vector();
        this.facingLeft = true;
        this.expired = false;
        this.jumping = false;
        this.jumpTime = 0;
        this.shape = shape;
    }
    HutJumper.Model.Entity.prototype = {
        mass: 1,
        JUMP_FORCE: 3.5,
        
        /**
         *  Returns the bounding shape.
         */
        getBoundingShape: function getBoundingShape() {
            this.shape.position = this.position;
            return this.shape;
        },
        
        /**
         *  Sets the acceleration of this entity.
         *  
         *  @param {Vector} accel   The new acceleration.
         */
        setAcceleration: function setAcceleration(accel) {
            this.acceleration = accel;
        },
        
        /**
         *  Simulates the velocity of this entity.
         *  
         *  @param {number} friction   Friction of movement.
         */
        stepVelocity: function stepVelocity(friction, delta) {
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
        stepPosition: function stepPosition(delta) {
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
        isOnGround: function isOnGround(world) {
            var bShape = this.getBoundingShape();
            return bShape.position.y + bShape.getHeight()/2 >= world.getMaxY() - world.getGroundHeight();
        },
        
        /**
         *  Returns true if the entity is currently colliding
         *  with the given Entity, false otherwise.
         *
         *  @param {Entity} that    The collision candidate.
         *  @returns {boolean}      The collision status of the two Entities.
         */
        isColliding: function isColliding(that) {
            return HutJumper.Model.Shape.intersect(this.getBoundingShape(), that.getBoundingShape());
        },
        
        /**
         *  Model physical collision of the given Entity with
         *  this one, adjusting position and velocity.
         *
         *  @param {Entity} that            The other Entity.
         *  @param {number} restitution     The coefficient of restitution.
         */
        collide: function collide(that, restitution, deltaTime) {
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
            if (vn > 0.0) {
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
        collideBounds: function collideBounds(world, restitution, deltaTime) {
            var minX = world.getMinX();
            var maxX = world.getMaxX();
            var minY = world.getMinY();
            var maxY = world.getMaxY() - world.getGroundHeight();
            
            var collided = false;
            
            var bShape = this.getBoundingShape();
            if (this.typeId === 'pc' && bShape.position.y > maxY) {
                // console.debug(bShape, maxY);
                // alert(this);
            }
            if (bShape.position.x - bShape.getWidth()/2 <= minX && this.velocity.x < 0) { 
                this.velocity.x = -this.velocity.x * restitution;
                this.position.x = minX + bShape.getWidth()/2; 
                collided = true;
            } else if (bShape.position.x + bShape.getWidth()/2 >= maxX && this.velocity.x > 0) {
                this.velocity.x = -this.velocity.x * restitution;
                this.position.x = maxX - bShape.getWidth()/2;
                collided = true;
            }
            if (bShape.position.y - bShape.getHeight()/2 <= minY && this.velocity.y < 0) {
                this.velocity.y = -this.velocity.y * restitution;
                this.position.y = minY + bShape.getHeight()/2;
                collided = true;
            } else if (bShape.position.y  + bShape.getHeight()/2 >= maxY && this.velocity.y > 0) {
                //alert('yes!');
                this.velocity.y = -this.velocity.y * restitution;
                this.position.y = maxY - bShape.getHeight()/2;
                collided = true;
            }
            if (collided) {
                this.onCollideBounds();
            }
        },
        
        /**
         *  Event handling for collision with world bounds.
         */
        onCollideBounds: function onCollideBounds() {
            //implement me
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
     *  Creature class. Rectangular bounds.
     */
    HutJumper.Model.Creature = function Creature(typeId, world, x, y, width, height, velocity){
        this._super.call(this, typeId, world, new HutJumper.Model.RectShape(x, y, width, height), velocity);
    }
    extend(HutJumper.Model.Entity, HutJumper.Model.Creature, {});
    
    /**
     *  Projectile class.
     *
     *  @extends {Entity}
     */
    HutJumper.Model.Projectile = function Projectile(typeId, world, source, x, y, radius, velocity, lifeTime) {
        this._super.call(this, typeId, world, new HutJumper.Model.CircleShape(x, y, radius));
        this.velocity = velocity;
        this.source = source;
        this.lifeTime = lifeTime;
    };
    extend(HutJumper.Model.Entity, HutJumper.Model.Projectile, {
     
        /**
         *  Updates expiration based on lifeTime.
         */
        stepPosition: function stepPosition(delta) {
            this._super.prototype.stepPosition.call(this, delta);
            if (this.lifeTime > 0) {
                this.lifeTime -= delta;
            } else {
                this.expire();
            }
        }
    });
     
     /**
      * Hut class.
      */
    HutJumper.Model.Hut = function Hut(world, x, y, radius) {
        this._super.call(this, 'hut', world, new HutJumper.Model.RectShape(x, y, 130, 147));
        this.velocity = new HutJumper.Model.Vector(0,0);
    }
    extend(HutJumper.Model.Entity, HutJumper.Model.Hut, {
        collide: function collide(that, restitution, delta) {
			this._super.prototype.collide.call(this, that, restitution, delta);
			if (that.velocity.y > 0) {
				that.velocity.y = 0;
			}
        },
		
        /**
         *  No-op. Huts don't move.
         */
        stepPosition: function stepPosition(delta) {
            //do nothing
        }
    });
     
     

    /**
     *  World class.
     */
    HutJumper.Model.World = function World(gravity) {
        this.gravity = gravity;
        
        var HUT_SPACING = 200;
        this.worldEntities = [];
        for (var i = this.getMinX(); i < this.getMaxX(); i += HUT_SPACING) {
            var hut = new HutJumper.Model.Hut(this, i, this.getMaxY() - this.getGroundHeight(), 80);
            this.worldEntities.push(hut);
        }
    }
    HutJumper.Model.World.prototype = {
        //class-level constants
        CELL_WIDTH_PX: 50,
        CELL_HEIGHT_PX: 50,
        
        data: [
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
            [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        
        /**
         *  Get the height from the max y value to the ground surface.
         */
        getGroundHeight: function getGroundHeight() {
            return 20;
        },
        
        /**
         *  Get the minimum X value for this World.
         */
        getMinX: function getMinX() {
            return 0;
        },
        
        /**
         *  Get the maximum X value for this World.
         */
        getMaxX: function getMaxX() {
            return 20000;
            // return this.data[0].length * this.CELL_WIDTH_PX;
        },
        
        /**
         *  Get the minimum Y value for this World.
         */
        getMinY: function getMinY() {
            return 0;
        },
        
        /**
         *  Get the maximum Y value for this World.
         */
        getMaxY: function getMaxY() {
            return 2000;
            //return this.data.length * this.CELL_WIDTH_PX;
        },
        
        /**
         *  Convert the given in-world coordinates into cell coordinates.
         */
        worldToCell: function worldToCell(worldCoords) {
            return worldCoords.multiplyScalar(this.CELL_WIDTH_PX);
        },
        
        /**
         *  Convert the given cell coordinates into in-world coordinates.
         */
        cellToWorld: function cellToWorld(cellCoords) {
            return worldCoords.multiplyScalar(1/this.CELL_WIDTH_PX);
        }
    }
    
    /**
     *  Shape abstract class. For bounds collision.
     */
    HutJumper.Model.Shape = function Shape(position) {
        this.position = position;
    }
    $.extend(HutJumper.Model.Shape.prototype, {
        intersectX: function intersectX(x) {
            throw "Abstract. Implement me."
        },
        intersectY: function intersectY(y) {
            throw "Abstract. Implement me."
        },
        getHeight: function getHeight() {
            throw "Abstract. Implement me."
        },
        getWidth: function getWidth() {
            throw "Abstract. Implement me."
        }
    });
    HutJumper.Model.Shape.intersect = function intersect(shape1, shape2) {
        if (shape1.constructor === HutJumper.Model.CircleShape && shape2.constructor === HutJumper.Model.CircleShape) {
            //circle-circle intersection test
            return shape1.position.subtract(shape2.position).getLength() <= shape1.radius + shape2.radius;
        }
        if (shape1.constructor === HutJumper.Model.RectShape && shape2.constructor === HutJumper.Model.RectShape) {
            //rectangle-rectangle intersection test
            return !(shape1.position.x > shape2.position.x + shape2.width/2 || shape1.position.x + shape1.width/2 < shape2.position.x 
                    || shape1.position.y > shape2.position.y + shape2.height/2 || shape1.position.y + shape1.height/2 < shape2.position.y);
        }
        var circle, rectangle;
        if (shape1.constructor === HutJumper.Model.CircleShape && shape2.constructor === HutJumper.Model.RectShape) {
            circle = shape1;
            rectangle = shape2;
        } else if (shape1.constructor === HutJumper.Model.RectShape && shape2.constructor === HutJumper.Model.CircleShape) {
            circle = shape2;
            rectangle = shape1;
        } else {
            // can't do anything
            throw "Unrecognized shape!";
        }
        //circle-rectangle intersection test
        var circleDistance = new HutJumper.Model.Vector(Math.abs(circle.position.x - rectangle.position.x),
                Math.abs(circle.position.y - rectangle.position.y));
        
        // eliminate situations where they are just too far away
        if (circleDistance.x > (rectangle.width/2 + circle.r)) { return false; }
        if (circleDistance.y > (rectangle.height/2 + circle.r)) { return false; }
        
        // given we passed the above, check situations where they now MUST touch
        if (circleDistance.x <= (rectangle.width/2)) { return true; } 
        if (circleDistance.y <= (rectangle.height/2)) { return true; }

        cornerDistance_sq = (circleDistance.x - rectangle.width/2)^2 +
                         (circleDistance.y - rectangle.height/2)^2;
        return (cornerDistance_sq <= (circle.r^2));
    };
    
    /**
     *  RectShape class
     */
    HutJumper.Model.RectShape = function RectShape(x, y, width, height) {
        this._super.call(this, new HutJumper.Model.Vector(x, y));
        this.width = width;
        this.height = height;
    }
    extend(HutJumper.Model.Shape, HutJumper.Model.RectShape, {
        intersectX: function intersectX(x) {
            return (this.x - this.width/2 <= x) && (this.x + this.width/2 >= x);
        },
        intersectY: function intersectY(y) {
            return (this.y - this.height/2 <= y) && (this.y + this.height/2 >= y);
        },
        getHeight: function getHeight() {
            return this.height;
        },
        getWidth: function getWidth() {
            return this.width;
        }
    });
    
    /**
     *  CircleShape class
     */
    HutJumper.Model.CircleShape = function CircleShape(x, y, radius) {
        this._super.call(this, new HutJumper.Model.Vector(x,y));
        this.radius = radius;
    }
    extend(HutJumper.Model.Shape, HutJumper.Model.CircleShape, {
        intersectX: function intersectX(x) {
            return (this.x - this.radius <= x) && (this.x + this.radius >= x);
        },
        intersectY: function intersectY(y) {
            return (this.y - this.radius <= y) && (this.y + this.radius >= y);
        },
        getHeight: function getHeight() {
            return this.radius*2;
        },
        getWidth: function getWidth() {
            return this.radius*2;
        }
    });
    
    /**
     *  GameState class.
     */
    HutJumper.Model.GameState = function GameState(gravity) {
        this.world = new HutJumper.Model.World(gravity);
        this.pc = new HutJumper.Model.Creature('pc', this.world, 15, 15, 18, 38);
        this.entities = [this.pc].concat(this.world.worldEntities);
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
