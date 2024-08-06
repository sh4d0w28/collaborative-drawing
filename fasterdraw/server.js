const redis = require('redis');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Connect to Redis
const client = redis.createClient();
client.on('error', (err) => {
    console.error('Redis error:', err);
});

// Serve static files from the 'public' directory
app.use(express.static('public'));

app.get('/canvas.png', async (req, res) => {});

io.on('connection', async (socket) => {
    
    if(!client.connected) {
        await client.connect()
    }

    console.log('A user connected');

    socket.on('draw', (data) => {
        client.bitField("img",[{
            operation: 'SET',
            encoding: 'u4',
            offset: data.bit,
            value: data.color
        }])
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});