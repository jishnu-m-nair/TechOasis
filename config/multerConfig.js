// const multer = require('multer');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/uploads/'); // Define the upload directory (create it if it doesn't exist)
//     },
//     filename: function (req, file, cb) {
//         req.body.Imagename= Date.now() + '-' + file.originalname
//         cb(null, Date.now() + '-' + file.originalname); // Define the filename
//     }
// });

// const upload = multer({ storage: storage });

// const multer = require('multer');

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/uploads/');
//     },
//     filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//     }
// });

// const fileFilter = (req, file, cb) => {
//     // Allowed file types
//     const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
//     if (!allowedTypes.includes(file.mimetype)) {
//         // Reject file if not allowed
//         return cb(new Error('Invalid file type'), false);
//     }
//     cb(null, true);
// };

// const upload = multer({ 
//     storage: storage,
//     fileFilter: fileFilter,
//     limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
// });




// // Define storage configuration for category images
// const categoryStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/uploads/categories/'); // Define the upload directory for category images
//     },
//     filename: function (req, file, cb) {
//         // Rename the file with a unique name based on timestamp and original filename
//         req.body.imageName = Date.now() + '-' + file.originalname;
//         cb(null, req.body.imageName);
//     }
// });

// // Create a Multer instance specifically for category image uploads
// const categoryUpload = multer({ storage: categoryStorage });

// module.exports = { storage, upload, categoryStorage, categoryUpload };


const multer = require('multer');
const path = require('path');

function createMulterConfig({ storageDir, allowedTypes }) {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, storageDir); // Use the provided storage directory
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + '-' + path.basename(file.originalname); // Create a unique file name
            cb(null, uniqueName);
        }
    });

    const fileFilter = (req, file, cb) => {
        if (!allowedTypes.includes(file.mimetype)) {
            // Reject file if not in the allowed types
            return cb(new Error('Invalid file type'), false);
        }
        cb(null, true); // Accept the file
    };

    return multer({
        storage: storage,
        fileFilter: fileFilter,
        // limits: { fileSize: maxSize } // Set the maximum file size
    });
}

// General file upload configuration
const upload = createMulterConfig({
    storageDir: 'public/uploads/', // Directory for general file uploads
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'], // Allowed file types
    // maxSize: 5 * 1024 * 1024 // 5 MB file size limit
});
const productUpload = createMulterConfig({
    storageDir: 'public/uploads/products/', // Directory for general file uploads
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'], // Allowed file types
    // maxSize: 5 * 1024 * 1024 // 5 MB file size limit
});

// Category images upload configuration
const categoryUpload = createMulterConfig({
    storageDir: 'public/uploads/categories/', // Directory for category images
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'], // Allowed file types
    maxSize: 5 * 1024 * 1024 // 5 MB file size limit
});

// Other specific configurations can be added as needed
const documentUpload = createMulterConfig({
    storageDir: 'public/uploads/documents/', // Directory for documents
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], // Allowed file types
    maxSize: 10 * 1024 * 1024 // 10 MB file size limit
});

module.exports = { upload, productUpload, categoryUpload, documentUpload };
