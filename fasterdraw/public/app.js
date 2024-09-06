const dimX=128;
const dimY=128;
const colors = {0: '#000000', 1: '#005500',  2: '#00aa00',  3: '#00ff00',
                4: '#0000ff', 5: '#0055ff',  6: '#00aaff',  7: '#00ffff',
                8: '#ff0000', 9: '#ff5500', 10: '#ffaa00', 11: '#ffff00',
               12: '#ff00ff', 13: '#ff55ff', 14: '#ffaaff', 15: '#ffffff'
}
var colorInd = 0;
var size = 1;

function xytorect (cx, cy, size) {
    var x = Math.max(0, (cx-size+1));
    var y = Math.max(0, (cy-size+1));
    var w = size+1;
    var h = size+1;
    var res = {
        "left": x,
        "top": y,
        "w": w,
        "h": h,
        "right": Math.min(dimX-1, x + w),
        "bottom": Math.min(dimY-1, y + h)
    }; 
    //console.log(res['top'] + ".." + res['bottom'] + " " + res['left'] + ".." + res['right'] + " " + w + "x" + h);
    return res;  
}

/* generate buttons */
var btns = document.getElementById("btns");
Object.entries(colors).forEach((color) => {
    var button = document.createElement('button');
    button.setAttribute('data-id', color[0])
    // button.innerText = color[0];
    button.style.backgroundColor = color[1];
    button.addEventListener('click', function() {
        colorInd = this.dataset['id'];
        context.fillStyle = colors[colorInd];
    });
    btns.appendChild(button);
});

var slcts = document.getElementById("size");
slcts.onchange = function(e){ size = parseInt(e.target.selectedOptions[0].value); }

const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
//const socket = io();
const socket = io('https://edushm.com',{ path:'/node-drawcollab/socket.io'});

// Load existing drawing from the server
socket.on('loadDrawing', (data) => {
    var imageData = new ImageData(new Uint8ClampedArray(data),dimX,dimY)
    console.log(imageData);
    context.putImageData(imageData, 0, 0)
});

socket.on('draw', (data) => {
    var fs = context.fillStyle;
    context.fillStyle = colors[data.color];
    const bounds = xytorect(x,y,size);
    context.fillRect(bounds.left, bounds.top, bounds.w, bounds.h);
    context.fillStyle = fs;
});

canvas.addEventListener('mousedown', (e) => {
    const draw = (e) => {
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;

        const bounds = xytorect(mouseX,mouseY,size);

        /* draw */
        context.fillRect(bounds.left, bounds.top, bounds.w, bounds.h);

        /* send bit to server */
        const bits = [];
        for(var x = bounds.left; x<=bounds.right; x++) {
            for(var y = bounds.top; y <=bounds.bottom; y++) {
                bits.push((x+y*dimY));
            }
        }
        var data = {
            bits: bits,      // [5, 6, 10, 100, ... ]
            color: colorInd, // 10
            x: mouseX,       // 6
            y: mouseY,       // 10
            size: size        // 1
        };
        socket.emit('draw', data);
    };
    draw(e);
    canvas.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', () => {
        canvas.removeEventListener('mousemove', draw);
    }, { once: true });
});