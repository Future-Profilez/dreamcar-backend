const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3'); // Importing specific commands
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK for DigitalOcean Spaces (SDK v3)
const s3Client = new S3Client({
  region: process.env.region,
  endpoint: `https://${process.env.endpoint}`, // Endpoint for your DigitalOcean Space
  credentials: {
    accessKeyId: process.env.accesskeyId, // Your DigitalOcean Space Access Key
    secretAccessKey: process.env.secretAccess, // Your DigitalOcean Space Secret Key
  },
});

const upload = multer({ storage: multer.memoryStorage() });

const uploadFileToSpaces = async (file, isRecording = false) => {
  try {
    const fileName = `${uuidv4()}-${file.originalname.replaceAll(" ", "_")}`;
    const folder = isRecording ? "recordings" : "uploads";

    const uploadParams = {
      Bucket: process.env.bucketName,
      Key: `${folder}/${fileName}`,
      Body: file.buffer,
      ContentType: file.mimetype,
      ...(isRecording ? {} : { ACL: "public-read" }), // public only if not recording
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    if (isRecording) {
      // For recordings, return just the object key (private)
      return `${folder}/${fileName}`;
    } else {
      // For normal files, return full public URL
      return `https://${process.env.bucketName}.${process.env.endpoint}/${folder}/${fileName}`;
    }
  } catch (err) {
    console.error("Upload error:", err.message);
    return null;
  }
};

const deleteFileFromSpaces = async (fileUrl) => {
  try {
    // Extract the file key from the URL
    const urlParts = fileUrl.split('/');
    const fileKey = urlParts.slice(urlParts.indexOf('uploads')).join('/'); // Extracting 'uploads/filename'

    // Prepare the delete parameters
    const deleteParams = {
      Bucket: process.env.bucketName, // Your Space Name
      Key: fileKey, // File key from the URL
    };

    // Using DeleteObjectCommand to delete the file
    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    return true;
  } catch (err) {
    console.error('Delete error:', err.message);
    return false;
  }
};

module.exports = { upload, uploadFileToSpaces, deleteFileFromSpaces };