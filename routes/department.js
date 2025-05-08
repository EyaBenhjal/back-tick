const express = require("express");
const { addDepartment, getDepartments, updateDepartment, getDepartment, deleteDepartment} = require("../controllers/departmentController");

const router = express.Router();

router.post("/add", addDepartment); // Supprimer verifyAccessToken temporairement
router.get("/list", getDepartments);
router.get("/:id", getDepartment);
router.put("/:id", updateDepartment);
router.delete("/:id", deleteDepartment);

module.exports = router;
