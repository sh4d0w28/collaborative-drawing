const dimX=500;
const dimY=500;

const redis = require('redis');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to Redis
const client = redis.createClient();
const colors = {
    0: [0, 0, 0], 1: [0, 0x55, 0],  2: [0,0xAA,0],  3: [0, 0xff, 0], 
    4: [0, 0, 0xff], 5: [0,0x55,0xff],  6: [0, 0xaa, 0xff],  7: [0,0xff,0xff],
    8: [0xff, 0, 0], 9: [0xff,0x55,0], 10: [0xff, 0xaa, 0], 11: [0xff, 0xff, 0], 
   12: [0xff, 0, 0xff], 13:[0xff, 0x55, 0xff], 14: [0xff, 0xaa, 0xff], 15: [0xff,0xff,0xff]
};
(async () => {
    // Connect to redis server
    await client.connect();
    client.del('img')
    client.bitField("img",[{ operation: 'SET', encoding: 'u4', offset: '#'+(dimX*dimY-1), value: 0}])
})();

client.on('error', (err) => {
    console.error('Redis error:', err);
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/im', async (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    let uint8s = await readimg()
    res.write(Buffer.from(uint8s));
    res.end(()=>{})
});

/// buffer: Buffer
function splitBytes(buffer) {
    const result = [];
    for (let byte of buffer) {
        const high4Bits = (byte >> 4) & 0x0F;
        const low4Bits = byte & 0x0F;
        result.push(high4Bits);
        result.push(low4Bits);
    }
    return result;
}

function rgbToUint8ClampedArray(rgbs) {
    let uint8s = new Uint8ClampedArray(dimX*dimY*4)
    rgbs.forEach((a,i) => {    
        uint8s[i*4+0] = colors[a][0];
        uint8s[i*4+1] = colors[a][1];
        uint8s[i*4+2] = colors[a][2];
        uint8s[i*4+3] = 255;
    });
    return uint8s;
}

async function readimg() {
    let data = await client.get('img')
    if(!data){return;}
    const buffer = Buffer.from(data, 'binary');
    const result = splitBytes(buffer);
    return result;
}

async function getUintClampedImage() {
    let data = await client.get(redis.commandOptions({returnBuffers: true}), 'img');
    if(!data){return new Uint8ClampedArray(0)}
    const result = splitBytes(data);
    let uint8s = rgbToUint8ClampedArray(result);

    return uint8s;
}

io.on('connection', async (socket) => {
    
    console.log('A user connected');
    
    let d = await getUintClampedImage()
    socket.emit('loadDrawing', d);

    socket.on('draw', (data) => {
        const op = [];
        data.bits.forEach((v) => {
            op.push({ operation: 'SET', encoding: 'u4', offset: '#'+v, value: data.color});    
        });
        client.bitField("img",op);
        socket.broadcast.emit("draw", data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});