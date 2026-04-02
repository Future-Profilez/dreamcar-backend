const { S3Client, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');
require('aws-sdk/lib/maintenance_mode_message').suppress = true;

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const UPLOADS_FOLDER = "uploads/"; // Folder name in S3

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            cb(null, `${UPLOADS_FOLDER}${Date.now().toString()}-${file.originalname.replace(/\s/g, '')}`);
        },
        contentDisposition: 'inline',
    }),
});

/**
 * Function to upload a file to S3 inside the uploads folder
 * @param {Express.Request} req - Express request object
 * @param {Express.Response} res - Express response object
 * @returns {Promise<{ status: boolean, fileUrl?: string, message: string }>}
 */
const uploadFile = (req, res) => {
    return new Promise((resolve, reject) => {
        upload.single('file')(req, res, (err) => {
            if (req.file) {
                // console.log("File Uploaded Successfully:", req.file);
                resolve({ status: true, message: "File uploaded successfully", fileUrl: req?.file?.location });
            }
            else if (err) {
                console.error("Multer Error:", err);
                reject({ status: false, message: "File upload failed", error: err.message });
            } else if (!req.file) {
                console.error("No file received");
                reject({ status: false, message: "No file received" });
            } else {
                console.log("File Uploaded Successfully:", req.file);
                resolve({ status: true, message: "File uploaded successfully", fileUrl: req.file.location });
            }
        });
    });
};


/**
 * Function to delete a file from S3 inside the uploads folder
 * @param {string} fileUrl - Full S3 file URL
 * @returns {Promise<{ status: boolean, message: string }>}
 */
const deleteFile = async (fileUrl) => {
    const bucketName = process.env.S3_BUCKET_NAME;

    // Extract the key from the file URL and ensure it starts with "uploads/"
    let key = decodeURIComponent(fileUrl.split(`https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]);

    if (!key || !key.startsWith(UPLOADS_FOLDER)) {
        return { status: false, message: 'Invalid file URL or file not in uploads folder' };
    }

    try {
        // Check if the file exists before attempting deletion
        await s3Client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));

        // File exists, proceed with deletion
        await s3Client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));

        return { status: true, message: 'File deleted successfully' };
    } catch (error) {
        if (error.name === 'NotFound') {
            return { status: false, message: 'File not found' };
        }
        return { status: false, message: 'Error deleting file', error: error.message };
    }
};

module.exports = { upload, uploadFile, deleteFile };