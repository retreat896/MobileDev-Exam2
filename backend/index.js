require('dotenv').config(); // Load environment variables from .env
const express = require('express');
const { MongoClient, ServerApiVersion, Int32 } = require('mongodb');
const Buffer = require('buffer').Buffer;

const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// MongoDB connection URI from environment variables
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

async function run() {
    try {
        // Connect the client to the server (optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db('admin').command({ ping: 1 });
        console.log('Pinged your deployment. You successfully connected to MongoDB!');

        const database = client.db('MyDB');
        const collection = database.collection('images');

        async function getNextId() {
            const last = await collection.find().sort({ image_id: -1 }).limit(1).toArray();
            return last.length > 0 ? last[0].image_id + 1 : 1;
        }

        // GET endpoint to retrieve all documents
        app.get('/images', async (req, res) => {
            try {
                const items = await collection.find({}).toArray();
                res.status(200).json(items);
            } catch (error) {
                console.error('Error retrieving items:', error);
                res.status(500).send('Error retrieving items');
            }
        });

        // GET endpoint to retrieve all documents
        app.get('/image/:id', async (req, res) => {
            try {
                const image_id = req.params.id;
                const image = await collection.findOne({ image_id: new Int32(image_id) });

                if (!image || !image.image) return res.status(404).send('Image not found');

                const imageSplit = image.image.includes(',') ? image.image.split(',')[1] : image.image;

                let contentType = 'image/jpeg'; // default displayable type
                try {
                    if (image.image.includes(',')) {
                        contentType = image.image.split(';')[0].split(':')[1] || contentType;
                    }
                } catch (e) {}

                const imgBuffer = Buffer.from(imageSplit, 'base64');

                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Content-Length': imgBuffer.length,
                    'Content-Disposition': 'inline', // ensures browser displays the image
                });

                res.end(imgBuffer);
            } catch (error) {
                console.error('Error retrieving image:', error);
                res.status(500).send('Error retrieving image');
            }
        });

        // POST endpoint to insert a new document
        app.post('/images', async (req, res) => {
            try {
                console.log('Requested a post on images: ', req.body);
                let newItem = req.body;
                if (!newItem || Object.keys(newItem).length === 0) {
                    return res.status(400).send('Request body cannot be empty.');
                }

                //get next id from db
                let new_id = await getNextId();

                newItem = { ...newItem, image_id: new_id };
                const result = await collection.insertOne(newItem);
                res.status(201).json({ message: 'Item added successfully', insertedId: result.insertedId, image_id: new_id, newItem });
            } catch (error) {
                console.error('Error adding item:', error);
                res.status(500).send('Error adding item');
            }
        });

        // Start the Express server
        app.listen(port, () => {
            console.log(`Server listening at http://localhost:${port}`);
        });
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close(); // You might want to keep the connection open for the duration of the server
    }
}
run().catch(console.dir);
