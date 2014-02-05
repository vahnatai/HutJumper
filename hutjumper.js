var FPS = 3;
var CANVAS_WIDTH = 800;
var CANVAS_HEIGHT = 600;
var canvas;
var lastTime = 0;

var position = {
    x: 50,
    y: 50
};

var update = function(delta) {
    //TODO
    position.x = Math.random() * CANVAS_WIDTH;
    position.y = Math.random() * CANVAS_HEIGHT;
};

var render = function() {
    canvas.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    //TODO
    canvas.fillStyle = "#000"; // Set color to black
    canvas.fillText("Sup Broseph!", position.x, position.y);
};

window.onload = function() {
    canvas = document.getElementById('mainCanvas').getContext("2d");
    setInterval(function(){
        var time = new Date().getTime();
        var delta = (lastTime ? (lastTime - time) : 0);
        update(delta);
        render();
    }, 1000/FPS);
};