// multer is a middleware for handling multipart/form-data, which is primarily used for file uploads

import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // allow image and video mime types
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image or video files are allowed"), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  // increase file size limit to accommodate short videos (50MB)
  limits: { fileSize: 50 * 1024 * 1024 },
});

export default upload;