const mongoose = require("mongoose");
const CategoryModel = require("../../model/category-model");
const UserModel = require("../../model/user-model");
const ProductModel = require("../../model/product-model");
const { categoryUpload } = require("../../config/multerConfig");
const path = require("path");

const categoryManagementGet = async (req, res) => {
    try {
        const categories = await CategoryModel.find({ isFeatured: true });
        res.render("admin/category", {
            pagetitle: "Category",
            categories: categories,
            page: "category-management"
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).send("Internal Server Error");
    }
};

const categoryManagementCreate = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!req.file) {
            return res.status(400).json({ message: "Category image is required" });
        }

        const imagePath = req.file.filename;
        const imageName = path.basename(imagePath);
        const basePath = "uploads/categories/";
        const image = path.join(basePath, imageName);

        const categoryExists = await CategoryModel.findOne({
            name: { $regex: new RegExp(`^${name}$`, "i") },
        });

        if (categoryExists) {
            return res.status(400).json({ message: "Category with this name already exists" });
        }

        const category = new CategoryModel({
            name,
            description,
            image,
        });

        await category.save();

        res.status(201).json({ message: "Category added successfully" });
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
        const category = await CategoryModel.findById(categoryId);

        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        const categoryExists = await CategoryModel.findOne({
            name: { $regex: new RegExp(`^${editName}$`, "i") },
            _id: { $ne: categoryId },
        });

        if (categoryExists) {
            return res.status(400).json({ message: "Category with this name already exists" });
        }

        category.name = editName;
        category.description = editDescription;

        if (req.file) {
            const imagePath = req.file.path;
            const imageName = path.basename(imagePath);
            const basePath = "uploads/categories/";
            const categoryImage = path.join(basePath, imageName);
            category.image = categoryImage;
        }

        await category.save();
        res.status(200).json({ message: 'Category updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const categoryManagementFeatured = async (req, res) => {
    try {
        let { categoryId } = req.body;
        let category = await CategoryModel.findById(categoryId);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        category.isFeatured = !category.isFeatured;
        await category.save();

        res.status(200).json({ 
            status: true, 
            isFeatured: category.isFeatured,
            message: `Category ${category.isFeatured ? 'published' : 'unpublished'} successfully`
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

const getCategoryList = async (req, res) => {
    try {
        const { filter, search } = req.body;

        const filterCriteria = {};
        if (filter === 'true') {
            filterCriteria.isFeatured = true;
        } else if (filter === 'false') {
            filterCriteria.isFeatured = false;
        }
        if (search) {
            filterCriteria.name = { $regex: search, $options: 'i' };
        }

        const categories = await CategoryModel.find(filterCriteria);

        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'An error occurred while fetching categories. Please try again later.' });
    }
};

module.exports = {
    categoryManagementCreate,
    categoryManagementGet,
    categoryManagementEdit,
    categoryManagementFeatured,
    getCategoryList
};