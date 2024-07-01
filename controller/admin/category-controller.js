const categoryModel = require("../../model/category-model");
const userModel = require("../../model/user-model");
const productModel = require("../../model/product-model");
const mongoose = require("mongoose");
const { log } = require("console");
const { categoryUpload } = require('../../config/multerConfig'); // Import the category upload middleware
const path = require('path')


const categoryManagementGet = async (req, res) => {
  try {
    if (req.session.admin) {
      const categories = await categoryModel.find(); // Fetch all categories from the database

      // Pass the categories to the view
      // log(req.session.editCategory)
      if (req.session.categoryData === true) {
        req.session.categoryData = false;
        res.render("admin/category", {
          pagetitle: "Category",
          categories: categories,
          error: "Category name already exists", // Pass the categories to the view
        });
      } else if (req.session.newCategory===true) {
        req.session.newCategory = false
        res.render("admin/category", {
          pagetitle: "Category",
          categories: categories,
          error: "New Category added succesfully",
        });
      } else if (req.session.editCategory === true) {
        req.session.editCategory = false
        res.render('admin/category', {
            pagetitle: 'Category',
            categories: categories,
            error:'Category edited succesfully'
        })
      } else {
        res.render("admin/category", {
          pagetitle: "Category",
          categories: categories,
          error: "",
        });
      }
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).send("Internal Server Error");
  }
};

// const categoryManagementCreate = async (req, res) => {
//   try {
//     const { name, description } = req.body;
//     let image = null;
//     if (req.file) {
//       image = req.file.path.replace(/\\/g, "/").replace("public/", "");
//     }
//     image = req.file ? req.file.buffer.toString('base64') : null; // Store image as base64 string

//     //   Check if a category with the same name already exists (case-insensitive)
//     const categoryExists = await categoryModel.findOne({
//       name: { $regex: new RegExp(`^${name}$`, "i") },
//     });

//     if (categoryExists) {
//       req.session.categoryData = true;
//       return res.status(400).redirect("/admin/category-management");
//     }

//     const category = new categoryModel({
//       name,
//       description,
//       image,
//     });

//     await category.save();
//     req.session.newCategory = true

//     res.status(201).redirect("/admin/category-management");
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

const categoryManagementCreate = async (req, res) => {
  try {
    const { name, description } = req.body;
     // Make sure the file is properly uploaded

    // Check if a file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: "Category image is required" });
    }

    // Use req.file to access the uploaded file
    const image = req.file.filename;
    
    // Check if a category with the same name already exists (case-insensitive)
    const categoryExists = await categoryModel.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    });

    if (categoryExists) {
      req.session.categoryData = true;
      return res.status(400).redirect("/admin/category-management");
    }

    // Create a new category instance
    const category = new categoryModel({
      name,
      description,
      image
    });

    // Save the category to the database
    await category.save();
    req.session.newCategory = true;

    // Redirect to the category management page
    res.status(201).redirect("/admin/category-management");
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const categoryManagementEdit = async (req, res) => {
  try {
    let { editName, editDescription } = req.body;
    editName = editName.trim();
    editDescription = editDescription.trim();
    const categoryId = req.params.categoryId;
    const category = await categoryModel.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if a category with the same name already exists (case-insensitive)
    const categoryExists = await categoryModel.findOne({
      name: { $regex: new RegExp(`^${editName}$`, "i") }, // Using a case-insensitive regex match
      _id: { $ne: categoryId },
    });

    if (categoryExists) {
      req.session.categoryData = true;
      return res.status(400).redirect("/admin/category-management");
    }

    // Update name and description
    category.name = editName;
    category.description = editDescription;
    // console.log(category.image+"############");
    // Update image if a new one is uploaded
    // if (req.file) {
    //   // Replace backslashes with forward slashes and remove 'public/' from the path
    //   const newImage = req.file.path.replace("public/", "");
    //   category.image = newImage;
    // }
    if (req.file) {
      // Extract filename from the path and save only the filename
      const imagePath = req.file.path;
      const imageName = path.basename(imagePath);
      category.image = imageName;
  }
    console.log(req.body, req.file);
    await category.save();
    req.session.editCategory = true
    res.status(200).redirect("/admin/category-management");
    // res.status(200).json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const categoryManagementFeatured = async (req, res) => {
  try {
    let { categoryId } = req.body;
    let data = await categoryModel.findById(categoryId);
    if (data.isFeatured === true) {
      data.isFeatured = false;
      await productModel.updateMany(
        { category: new mongoose.Types.ObjectId(categoryId) },
        { $set: { isFeatured: false } }
      );
      await data.save();
      res.status(200).json({ status: true });
    } else if (data.isFeatured === false) {
      data.isFeatured = true;
      await productModel.updateMany(
        { category: new mongoose.Types.ObjectId(categoryId) },
        { $set: { isFeatured: true } }
      );
      await data.save();
      res.status(200).json({ status: true });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = {
  categoryManagementCreate,
  categoryManagementGet,
  categoryManagementEdit,
  categoryManagementFeatured,
};
