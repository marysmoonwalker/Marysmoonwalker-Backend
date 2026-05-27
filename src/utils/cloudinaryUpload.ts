import cloudinary from '../config/cloudinary';

export const extractPublicId = (url: string): string | null => {
    try {
        const parts       = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return null;

        const afterUpload = parts.slice(uploadIndex + 1);
        const startIndex  = afterUpload[0]?.match(/^v\d+$/) ? 1 : 0;
        const withExt     = afterUpload.slice(startIndex).join('/');

        return withExt.replace(/\.[^/.]+$/, '') || null;
    } catch {
        return null;
    }
};

export const uploadToCloudinary = async (fileBuffer: Buffer, folder: string = 'blog_avatars'): Promise<string> => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder },
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