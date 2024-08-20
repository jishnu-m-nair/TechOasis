const multer = require('multer');
const path = require('path');

function createMulterConfig({ storageDir, allowedTypes }) {
    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, storageDir);
        },
        filename: function (req, file, cb) {
            const uniqueName = Date.now() + '-' + path.basename(file.originalname);
            cb(null, uniqueName);
        }
    });

    const fileFilter = (req, file, cb) => {
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
    };

    return multer({
        storage: storage,
        fileFilter: fileFilter,
    });
}

const upload = createMulterConfig({
    storageDir: 'public/uploads/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
});
const productUpload = createMulterConfig({
    storageDir: 'public/uploads/products/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
});

const categoryUpload = createMulterConfig({
    storageDir: 'public/uploads/categories/',
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
});

const documentUpload = createMulterConfig({
    storageDir: 'public/uploads/documents/',
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
});

module.exports = { upload, productUpload, categoryUpload, documentUpload };
