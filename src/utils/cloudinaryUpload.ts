import cloudinary from '../config/cloudinary';

export const uploadToCloudinary = async (fileBuffer: Buffer): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'blog_avatars' },
            (error, result) => {
                if (error) return reject(error);
                resolve(result?.secure_url || '');
            }
        );
        uploadStream.end(fileBuffer);
    });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error(`Cloudinary Delete Error: ${error}`);
    }
};