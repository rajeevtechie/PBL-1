const multer = require('multer');

// Configure storage: Store files in memory (RAM) as a Buffer
const storage = multer.memoryStorage();

// File filter: Accept only PDF and Images
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only PDFs or Images are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Limit to 10MB
});

module.exports = upload;