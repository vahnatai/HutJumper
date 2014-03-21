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
            sub.prototype[propName] = properties[propName];
            Object.defineProperty(sub.prototype, propName, { 
                enumerable: true, 
                value: properties[propName]
            });
        }
    }
    sub.prototype._super = base;
}

/**
 *  If value is defined, returns value. Otherwise returns
 *  defaultValue. Useful for function parameter defaults.
 *
 *  @param value        A value which may be undefined.
 *  @param defaultValue A default value to use if value is undefined.
 *  @returns            value if it is defined, else defaultValue.
 */
function valueOrDefault(value, defaultValue) {
    return (typeof value !== 'undefined' ? value : defaultValue);
}