/*========Vector Class========*/
function Vector(x, y) {
	//default parameter values 
	if (!x){
		x = 0;
	}
	if (!y){
		y = 0;
	}
	
	this.x = x;
	this.y = y;

	this.getLength = function() {
		return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
	}
	
	this.normalized = function() {
		var length = this.getLength();
		var x = this.x / length;
		var y = this.y / length;
		return new Vector(x, y);
	}
	
	this.add = function(that) {
		var x = this.x + that.x;
		var y = this.y + that.y;
		return new Vector(x, y);
	}
	
	this.subtract = function(that) {
		var x = this.x - that.x;
		var y = this.y - that.y;
		return new Vector(x, y);
	}
	
	this.dotProduct = function(that) {
		return ( (this.x * that.x) + (this.y * that.y) );
	}
	
	this.multiplyScalar = function(scalar) {
		var x = (this.x * scalar);
		var y = (this.y * scalar);
		return new Vector(x, y);
	}
}

/*========Ball Class========*/
function Ball(x, y, radius, color) {
	if (!color) {
		color = "#000000";
	}
	
	this.position = new Vector(x,y);
	this.radius = radius;
    this.width = 18;
    this.height = 38;
    this.facingLeft = true;
	this.mass = 1;

	this.velocity = new Vector();
	this.acceleration = new Vector();
	
	this.color = color;
	
	this.setAcceleration = function(accel) {
		this.acceleration = accel;
	}

	this.stepVelocity = function() {
		var changed = false;
        var friction = this.velocity.multiplyScalar(FRICTION_C);
        
		this.velocity = this.velocity.add(this.acceleration).subtract(friction);
	};
	
    /**
     * XXX maybe this function should be moved out of the ball class,
     * to World or some game logic elsewhere?
     */
	this.stepPosition = function() {
		var changed = false;
		if (this.velocity.getLength()) {
            //XXX
			this.position = this.position.add(this.velocity);
		}
	};
	
	this.isOnGround = function() {
		return this.position.y + this.radius >= world.getMaxY();
	};
	
	this.isColliding = function(that) {
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
	};
	
	this.collide = function(that) {
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
	};
	
	this.collideBounds = function() {
        var minX = world.getMinX();
        var maxX = world.getMaxX();
        var minY = world.getMinY();
        var maxY = world.getMaxY();
    
		if ((this.position.x - this.radius <= minX) 
				&& (this.velocity.x < 0)) { 
			this.velocity.x = -this.velocity.x * RESTITUTION;
			this.position.x = minX + this.radius; 
		} else if ((this.position.x + this.radius >= maxX)
				&& (this.velocity.x > 0) ) {
			this.velocity.x = -this.velocity.x * RESTITUTION;
			this.position.x = maxX - this.radius;
		}
		if (this.position.y - this.radius <= minY
				&& (this.velocity.y < 0) ) {
			this.velocity.y = -this.velocity.y * RESTITUTION;
			this.position.y = minY + this.radius;
		} else if (this.position.y + this.radius >= maxY
				&& (this.velocity.y > 0) ) {
			this.velocity.y = -this.velocity.y * RESTITUTION;
			this.position.y = maxY - this.radius;
		}
	};
}

/*========World Class========*/
function World() {
    var CELL_WIDTH_PX = 50;
    var CELL_HEIGHT_PX = 50;
    this.data = [
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0]]
    
    this.getMinX = function() {
        return 0;
    }
    this.getMaxX = function() {
        return this.data[0].length * CELL_WIDTH_PX;
    }
    this.getMinY = function() {
        return 0;
    }
    this.getMaxY = function() {
        return this.data.length * CELL_WIDTH_PX;
    }
	this.worldToCell = function(worldCoords) {
		return worldCoords.multiplyScalar(CELL_WIDTH_PX);
	}
	this.cellToWorld = function(cellCoords) {
		return worldCoords.multiplyScalar(1/CELL_WIDTH_PX);
	}
}

/*========CharacterTiles Class========*/
function CharacterTiles(left, leftWalk, rightWalk, right) {
    this.left = left;
    this.leftWalk = leftWalk;
    this.right = right;
    this.rightWalk = rightWalk;
}
