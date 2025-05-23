const Department= require("../models/Department");

const getDepartments = async (req, res) => {
  console.log("👉 GET /api/department/list appelé");
  try {
    const departments = await Department.find();
    return res.status(200).json({ success: true, departments });
  } catch (error) {
    console.error("❌ Erreur getDepartments:", error);
    return res.status(500).json({ success: false, error: "get department server error" });
  }
}

const addDepartment= async (req, res) => {
  try {
    const { dep_name, description } = req.body;
    const newDep = new Department({ dep_name, description });
    await newDep.save();
    return res.status(200).json({ success: true, department: newDep });
  } catch (error) {
    return res.status(500).json({ success: false, error: "add department server error" });
  }
};
const getDepartment= async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validation de l'ID
    if (!id || id.length !== 24) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de département invalide" 
      });
    }

    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ 
        success: false, 
        error: "Departmentnot found" 
      });
    }

    return res.status(200).json({ 
      success: true, 
      department 
    });
  } catch (error) {
    console.error("Erreur serveur :", error);
    return res.status(500).json({ 
      success: false, 
      error: "Server error while fetching department" 
    });
  }
};

const updateDepartment= async (req, res) => {
  try {
    const { id } = req.params;
    const { dep_name, description } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: "ID du département requis" });
    }

    const updatedDepartment= await Department.findByIdAndUpdate(
      id,
      { dep_name, description },
      { new: true }
    );

    if (!updatedDepartment) {
      return res.status(404).json({ success: false, error: "Département non trouvé" });
    }

    return res.status(200).json({ 
      success: true, 
      department: updatedDepartment
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du département :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la mise à jour du département" });
  }
};
const deleteDepartment= async (req, res) => {
  try {
    const { id } = req.params;
    console.log("👉 DELETE /api/department/" + id); // 👈 Ajoute ça

    const deletedep = await Department.findByIdAndDelete(id);

    if (!deletedep) {
      return res.status(404).json({ success: false, error: "Département non trouvé" });
    }

    return res.status(200).json({ success: true, deletedep });
  } catch (error) {
    console.error("Erreur suppression département :", error);
    return res.status(500).json({ success: false, error: "Erreur serveur lors de la suppression du département" });
  }
}






module.exports = { addDepartment, getDepartments ,getDepartment, updateDepartment,deleteDepartment};
