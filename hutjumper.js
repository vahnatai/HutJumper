/**
 * Controls the drawing and interactivity of a side-scrolling game on an
 * HTML 5 canvas element.
 * 
 * @author Vahnatai
 */

var controller;

window.onload = function() {
    var canvas = document.getElementById('mainCanvas');
    controller = new HutJumper.Engine.Controller(document, canvas);
    controller.start();
}
