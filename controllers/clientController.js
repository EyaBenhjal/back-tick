import bcrypt from 'bcrypt'
import User from "../models/User.js"
import path from "path"
import multer from "multer"

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads")
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname))
  }
})

const upload = multer({storage: storage})

const addclient = async (req, res) => {
  try {
    const {
      name,
      email,
      clientId,
      dob,
      gender,
      maritalStatus,
      designation,
      department,
      password,
      role
    } = req.body;

    // Vérification du département en premier
    if (!department) {
      return res.status(400).json({ success: false, error: "Departmentis required" });
    }

    // Vérification de l'email existant
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, error: "User already registered" });
    }

    // Vérification du clientId existant
    const existingClient = await client.findOne({ clientId });
    if (existingClient) {
      return res.status(400).json({ success: false, error: "Client ID already exists" });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashPassword,
      role,
      profileImage: req.file ? req.file.filename : ""
    });

    const savedUser = await newUser.save();

    const newclient = new client({
      userId: savedUser._id,
      clientId,
      dob,
      gender,
      maritalStatus,
      designation,
      department
    });

    await newclient.save();
    return res.status(200).json({ success: true, message: "Client created successfully" });

  } catch(error) {
    console.error("Error in addclient:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Server error in adding client",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
const getClients = async (req, res) => {
    try {
        const clients = await client.find().populate('userId', {password: 0}).populate("department")
        return res.status(200).json({ success: true, clients });
      } catch (error) {
        return res.status(500).json({ success: false, error: "get client server error" });
      }
}

const getAllOperatorsAndClients = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ["Client", "Agent", "Opérateur"] } // tu ajoutes les rôles que tu veux afficher
    }).select("-password"); // cacher les mots de passe

    return res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("Erreur dans getAllOperatorsAndClients:", error);
    return res.status(500).json({ success: false, error: "Erreur serveur" });
  }
};


export { addclient, upload, getClients, getAllOperatorsAndClients }