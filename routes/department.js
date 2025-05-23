const express = require("express");
const { addDepartment, getDepartments, updateDepartment, getDepartment, deleteDepartment} = require("../controllers/departmentController");
const { verifyAccessToken } = require("../middlewares/authMiddleware");

const router = express.Router();


router.post("/add", verifyAccessToken, addDepartment);
router.get("/list", verifyAccessToken, getDepartments);
router.get("/:id", verifyAccessToken, getDepartment);
router.put("/:id", verifyAccessToken, updateDepartment);
router.delete("/:id", verifyAccessToken, deleteDepartment);
module.exports = router;
