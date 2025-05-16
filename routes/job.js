const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Use Cloudinary SDK
const { createJob } = require('../controllers/job');
const streamifier = require('streamifier');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup to receive files
const upload = multer({
  storage: multer.memoryStorage(), // Store files in memory for Cloudinary upload
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
});

// Middleware to upload files to Cloudinary
const uploadToCloudinary = async (req, res, next) => {
  if (!req.files || (!req.files.image1 && !req.files.image2)) {
    return next(); // No files uploaded, skip Cloudinary upload
  }

  const uploadPromises = [];
  const uploadedFiles = {};

   const handleFileUpload = (file, fieldName) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'job_images' },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed for ${fieldName}: ${error.message}`));
        } else {
          uploadedFiles[fieldName] = result.secure_url;
          resolve();
        }
      }
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

  if (req.files.image1) {
    uploadPromises.push(handleFileUpload(req.files.image1[0], 'image1'));
  }
  if (req.files.image2) {
    uploadPromises.push(handleFileUpload(req.files.image2[0], 'image2'));
  }

  try {
    await Promise.all(uploadPromises);
    req.uploadedFiles = uploadedFiles; // Attach Cloudinary URLs to the request
    next(); // Proceed to the next middleware or controller
  } catch (error) {
    next(error); // Pass the error to the error handling middleware
  }
};

// Use the uploadToCloudinary middleware before createJob
router.post(
  '/job',
  upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 },
  ]),
  uploadToCloudinary,
  createJob, // Your controller to create the job in the database
);

module.exports = router;
