const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const { createCanvas } = require('canvas');

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

// Endpoint to get the PNG image
app.get('/canvas.png', async (req, res) => {
    const width = 128;
    const height = 128;
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');

    // Retrieve pixel data from Redis
    client.LRANGE('drawing', 0, -1, (err, data) => {
        if (err) {
            console.error('Error fetching data from Redis:', err);
            res.status(500).send('Server error');
            return;
        }

        const pixels = data.map(item => JSON.parse(item));

        // Draw the pixels on the canvas
        pixels.forEach(pixel => {
            context.fillStyle = pixel.color;
            context.fillRect(pixel.x, pixel.y, 1, 1);
        });

        // Set the response type to PNG and send the canvas as a PNG image
        res.setHeader('Content-Type', 'image/png');
        canvas.pngStream().pipe(res);
    });
});

io.on('connection', async (socket) => {
    console.log('A user connected');

    // Send existing drawing to the new user
    client.LRANGE('drawing', 0, -1, (err, data) => {
        console.log(err);
        console.log(data);
        if (err) {
            console.error('Error fetching data from Redis:', err);
            return;
        }

        const pixels = data.map(item => JSON.parse(item));
        console.log('Sending existing drawing data to client:', pixels); // Logging the data being sent
        socket.emit('loadDrawing', pixels);
    });

    socket.on('draw', (data) => {
        // Broadcast the draw event to all other connected clients
        socket.broadcast.emit('draw', data);

        // Save the drawing data to Redis
        client.RPUSH('drawing', JSON.stringify(data), (err) => {
            if (err) {
                console.error('Error saving data to Redis:', err);
            }
        });
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});