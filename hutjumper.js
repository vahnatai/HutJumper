/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 *
 * Control scheme:
 *  W - up
 *  S - down
 *  A - left
 *  D - right
 *  SPACE - jump
 *  MOUSE1 - shoot projectile
 *  MOUSE2 - change character
 * 
 * @author Vahnatai
 */

var controller;

window.onload = function() {
    var canvas = document.getElementById('mainCanvas');
    controller = new HutJumper.Engine.Controller(document, canvas);
    controller.start();
}
