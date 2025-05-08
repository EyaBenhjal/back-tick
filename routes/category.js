const express = require("express");
const {
  getCategories,
  addCategory,
  getCategory,
  updateCategory,
  deleteCategory,
  getCategoriesByDepartment
} = require("../controllers/categoryController");

const router = express.Router();

router.get("/list", getCategories);
router.post("/add", addCategory);
router.get("/:id", getCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.get('/by-department/:departmentId', getCategoriesByDepartment);

module.exports = router;
