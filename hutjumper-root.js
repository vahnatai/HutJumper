/**
 *  Define HutJumper root namespace.
 *
 *  @namespace HutJumper
 */
if (typeof HutJumper === 'undefined' || !HutJumper) {
    var HutJumper = {};
} else {
    console.error('"HutJumper" namespace is already defined.');
}

/**
 *  Make one class extend another.
 *
 *  @param base {function} Base class constructor.
 *  @param sub {function} Sub-class constructor.
 */
function extend(base, sub, properties) {
  sub.prototype = Object.create(base.prototype);
  sub.prototype.constructor = sub;
  Object.defineProperty(sub.prototype, 'constructor', { 
    enumerable: false, 
    value: sub 
  });
  if (typeof properties !== 'undefined' && properties) {
    for (propName in properties) {
        sub.prototype[propName]
        Object.defineProperty(sub.prototype, propName, { 
            enumerable: true, 
            value: properties[propName]
        });
    }
  }
}