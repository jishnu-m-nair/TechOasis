document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("editProductForm");

    form.addEventListener("focus", function(event) {
        event.target.classList.add('touched');
    }, true);

    form.addEventListener("input", function(event) {
        if (event.target.classList.contains('touched')) {
            validateField(event.target);
        }
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        if (isFormValid()) {
            console.log("All validations passed");
            submitFormEdit();
        }
    });

    function validateField(field) {
        switch (field.id) {
            case 'editProductName':
                validateProductName();
                break;
            case 'editProductDescription':
                validateDescription();
                break;
            case 'editMainImage':
                validateMainImage();
                break;
            case 'editAdditionalImages':
                validateAdditionalImages();
                break;
            case 'editProductBrand':
                validateBrand();
                break;
            case 'editProductCountInStock':
                validateStock();
                break;
            case 'editProductCategory':
                validateCategory();
                break;
            case 'editProductPrice':
                validatePrice();
                break;
            case 'editProductDiscountPrice':
                validateDiscountPrice();
                break;
        }
    }

    function validateProductName() {
        const productName = document.getElementById('editProductName');
        const productNameError = document.getElementById('editNameError');
        const value = productName.value.trim();
        if (value === "") {
            productNameError.textContent = "Product Name is required";
            productName.style.borderColor = 'red';
            return false;
        }
        productNameError.textContent = "";
        productName.style.borderColor = 'green';
        return true;
    }

    function validateDescription() {
        const productDescription = document.getElementById('editProductDescription');
        const descriptionError = document.getElementById('editDescriptionError');
        const value = productDescription.value.trim();
        if (value === "") {
            descriptionError.textContent = "Description is required";
            productDescription.style.borderColor = 'red';
            return false;
        }
        descriptionError.textContent = "";
        productDescription.style.borderColor = 'green';
        return true;
    }

    // function validateMainImage() {
    //     const mainImage = document.getElementById('editMainImage');
    //     const mainImageError = document.getElementById('editMainImageError');
    //     const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    //     if (mainImage.files.length > 0) {
    //         const file = mainImage.files[0];
    //         const fileExtension = file.name.split('.').pop().toLowerCase();
    //         if (!allowedExtensions.includes(fileExtension)) {
    //             mainImageError.textContent = "Only images with .jpg, .jpeg, .png, .gif, .webp are allowed";
    //             mainImage.style.borderColor = 'red';
    //             return false;
    //         }
    //     }
    //     mainImageError.textContent = "";
    //     mainImage.style.borderColor = 'green';
    //     return true;
    // }

    // function validateAdditionalImages() {
    //     const additionalImages = document.getElementById('editAdditionalImages');
    //     const additionalImagesError = document.getElementById('editImagesError');
    //     const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    //     for (let file of additionalImages.files) {
    //         const fileExtension = file.name.split('.').pop().toLowerCase();
    //         if (!allowedExtensions.includes(fileExtension)) {
    //             additionalImagesError.textContent = "Only images with .jpg, .jpeg, .png, .gif, .webp are allowed";
    //             additionalImages.style.borderColor = 'red';
    //             return false;
    //         }
    //     }
    //     additionalImagesError.textContent = "";
    //     additionalImages.style.borderColor = 'green';
    //     return true;
    // }

    function validateMainImage() {
        const mainImage = document.getElementById('editMainImage');
        const mainImageError = document.getElementById('editImageError');
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        
        if (mainImage.files.length > 0) {
            const file = mainImage.files[0];
            const fileExtension = file.name.split('.').pop().toLowerCase();
            if (!allowedExtensions.includes(fileExtension)) {
                mainImageError.textContent = "Only images with .jpg, .jpeg, .png, .gif, .webp are allowed";
                mainImage.style.borderColor = 'red';
                return false;
            }
            mainImageError.textContent = "";
            mainImage.style.borderColor = 'green';
        } else {
            // No new image selected, so no validation needed
            mainImageError.textContent = "";
            mainImage.style.borderColor = '';
        }
        return true;
    }
    
    function validateAdditionalImages() {
        const additionalImages = document.getElementById('editAdditionalImages');
        const additionalImagesError = document.getElementById('editImagesError');
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        console.log(additionalImages.files.length)
        
        if (additionalImages.files.length > 0) {
            for (let file of additionalImages.files) {
                const fileExtension = file.name.split('.').pop().toLowerCase();
                if (!allowedExtensions.includes(fileExtension)) {
                    additionalImagesError.textContent = "Only images with .jpg, .jpeg, .png, .gif, .webp are allowed";
                    additionalImages.style.borderColor = 'red';
                    return false;
                }
            }
            additionalImagesError.textContent = "";
            additionalImages.style.borderColor = 'green';
        } else {
            // No new images selected, so no validation needed
            additionalImagesError.textContent = "";
            additionalImages.style.borderColor = '';
        }
        return true;
    }

    function validateBrand() {
        const productBrand = document.getElementById('editProductBrand');
        const brandError = document.getElementById('editBrandError');
        const value = productBrand.value.trim();
        if (value === "") {
            brandError.textContent = "Brand is required";
            productBrand.style.borderColor = 'red';
            return false;
        }
        brandError.textContent = "";
        productBrand.style.borderColor = 'green';
        return true;
    }

    function validateStock() {
        const productStock = document.getElementById('editProductCountInStock');
        const stockError = document.getElementById('editStockError');
        const value = productStock.value.trim();
        const count = parseInt(value);
        if (value === "" || isNaN(count) || count < 0 || count > 300) {
            stockError.textContent = "Please enter a valid Count in Stock (0-300)";
            productStock.style.borderColor = 'red';
            return false;
        }
        stockError.textContent = "";
        productStock.style.borderColor = 'green';
        return true;
    }

    function validateCategory() {
        const productCategory = document.getElementById('editProductCategory');
        const categoryError = document.getElementById('editCategoryError');
        const value = productCategory.value;
        if (value === "") {
            categoryError.textContent = "Category is required";
            productCategory.style.borderColor = 'red';
            return false;
        }
        categoryError.textContent = "";
        productCategory.style.borderColor = 'green';
        return true;
    }

    function validatePrice() {
        const productPrice = document.getElementById('editProductPrice');
        const priceError = document.getElementById('editPriceError');
        const value = productPrice.value.trim();
        if (value === "" || isNaN(value) || value <= 0) {
            priceError.textContent = "Please enter a valid Original Price greater than 0";
            productPrice.style.borderColor = 'red';
            return false;
        }
        priceError.textContent = "";
        productPrice.style.borderColor = 'green';
        return true;
    }

    function validateDiscountPrice() {
        const productDiscountPrice = document.getElementById('editProductDiscountPrice');
        const discountPriceError = document.getElementById('editDiscountPriceError');
        const value = productDiscountPrice.value.trim();
        const discount = parseFloat(value);
        if (value === "" || isNaN(discount) || discount < 0 || discount > 90) {
            discountPriceError.textContent = "Please enter a valid Discount Price (0-90)";
            productDiscountPrice.style.borderColor = 'red';
            return false;
        }
        discountPriceError.textContent = "";
        productDiscountPrice.style.borderColor = 'green';
        console.log("discuont passed");
        return true;
    }

    function isFormValid() {
        return validateProductName() &&
        validateDescription() &&
        validateMainImage() &&
        validateAdditionalImages() &&
        validateBrand() &&
        validateStock() &&
        validateCategory() &&
        validatePrice() &&
        validateDiscountPrice();
    }

    function submitFormEdit() {
        // Fetch the form element
        // const form = document.getElementById(`editProductForm${productId}`);
        const form = document.getElementById('editProductForm');

        // if (!form) {
        //     console.error(`Form with ID 'editProductForm${productId}' not found`);
        //     alert("Error: Form not found. Please try again or contact support.");
        //     return;
        // }
        
        // Create a FormData object from the form
        const formData = new FormData(form);
        
        // Log form data for debugging (optional)
        console.log("Form method: " + form.method);
        console.log("Form data: ", formData);
    
        // Fetch product ID from form (assuming there's an input named 'productId' to specify which product to edit)
        const productId = document.getElementById('productId').value;
        
        // Send a PUT or POST request to update the product details
        fetch(`/admin/product-management/editProduct/${productId}`, {
            method: 'POST',  // Use PUT or POST depending on your server's requirements
            body: formData
        })
        // .then(response => response.json())
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // $('#editProductModal').modal('hide');
                alert(data.message);
                // Refresh only the modal content
                refreshModalContent(productId);
                // Optionally, refresh the page or update the product list
                // window.location.reload();
            } else {
                alert("Error updating product: " + data.error);
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("An error occurred while updating the product.");
        });
    }
    
});

