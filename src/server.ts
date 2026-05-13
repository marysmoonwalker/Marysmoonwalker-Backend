import app from './app';
import { connectDB } from './config/db';

const PORT = process.env.PORT || 5000;

/** Starts the server and connects to the database. */
const bootstrap = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

bootstrap();