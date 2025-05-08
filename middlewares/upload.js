


const multer = require("multer");
const path = require("path");

// Configuration pour les uploads généraux (users)
const storage = multer.diskStorage({
  destination: "public/uploads/",
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(2) + ext;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'profileImage' && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seul le champ profileImage avec une image est accepté'), false);
    }
  }
});

// Configuration spécifique pour les tickets
const ticketStorage = multer.diskStorage({
  destination: "public/tickets/", 
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = Date.now() + '-' + Math.random().toString(36).substring(2) + ext;
    cb(null, uniqueName);
  }
});

const ticketFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Seuls les fichiers JPEG, PNG, JPG et PDF sont autorisés pour les tickets'), false);
  }
};

const ticketUpload = multer({
  storage: ticketStorage,
  fileFilter: ticketFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
}).single('file'); // Champ attendu: 'file'

// Export unique et organisé
module.exports = {
  upload,          // Pour les uploads généraux (users)
  ticketUpload     // Spécifique aux tickets
};