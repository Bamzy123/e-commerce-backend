const app = require('./app');
const connectDB = require('./config/db');
const PORT = process.env.PORT || 5000;

connectDB().then(r =>
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    })
);