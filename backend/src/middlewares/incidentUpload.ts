import fs from 'fs';
import path from 'path';
import multer from 'multer';

const uploadDirectory = path.resolve(process.cwd(), 'uploads', 'incidents');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
        callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
});

export const incidentImageUpload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
        callback(null, file.mimetype.startsWith('image/'));
    },
});