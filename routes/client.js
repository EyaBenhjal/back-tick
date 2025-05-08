const express = require("express");
const { addclient,upload,getClients } = require("../controllers/clientController");

const router = express.Router();
router.get("/list", getClients); 
router.post("/add", upload.single('profileImage'), addclient);

//router.get("/list", getDepartments);
//router.get("/:id", getDepartment);
//router.put("/:id", updateDepartment);
//router.delete("/:id", deleteDepartment);

module.exports = router;
