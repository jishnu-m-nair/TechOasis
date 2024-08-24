async function cartWishlistCount() {
    const cartItemCount = document.getElementById('cartItemCount');
    const wishlistItemCount = document.getElementById('wishlistItemCount');
    const cartItemCount2 = document.getElementById('cartItemCount2');
    const wishlistItemCount2 = document.getElementById('wishlistItemCount2');

    try {
        const res = await fetch('/cart-wishlist-count');
        const data = await res.json();

        const { cartCount, wishlistCount } = data;

        // Update the counts in the span tags
        cartItemCount.textContent = cartCount;
        wishlistItemCount.textContent = wishlistCount;
        cartItemCount2.textContent = cartCount;
        wishlistItemCount2.textContent = wishlistCount;

        // Show or hide the cart count based on its value
        if (cartCount > 0) {
            cartItemCount.style.display = 'inline-block';
            cartItemCount2.style.display = 'inline-block';
        } else {
            cartItemCount.style.display = 'none';
            cartItemCount2.style.display = 'none';
        }

        // Show or hide the wishlist count based on its value
        if (wishlistCount > 0) {
            wishlistItemCount.style.display = 'inline-block';
            wishlistItemCount2.style.display = 'inline-block';
        } else {
            wishlistItemCount.style.display = 'none';
            wishlistItemCount2.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching cart and wishlist counts:', error);
    }
}

// Call the function when the page loads or whenever necessary
cartWishlistCount();
