function initModalHTML() {
    // Inject the Modal HTML globally into the body if it doesn't exist
    if (!document.getElementById('buyModal')) {
        const modalHTML = `
        <div class="modal" id="buyModal">
            <div class="modal-content" style="max-height: 85vh; overflow-y: auto; overflow-x: hidden;">
                <span class="modal-close" onclick="closeBuyPopup()">x</span>
                <div class="buy-header">
                    <h2 id="modalTitle">Review Your Order</h2>
                </div>
        
                <!-- Step 1: Review Section -->
                <div class="buy-body" id="reviewSection">
                    <div class="product-section" style="display: flex; flex-direction: column; align-items: center; text-align: center;">
                        <img class="product-img" src="" alt="Product Image" style="width: 100%; max-width: 300px; border-radius: 12px; margin-bottom: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.2);">
                        <div id="customDataSection" style="display: none; width: 100%; max-width: 250px; margin-bottom: 10px;">
                            <div class="custom-images-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; margin-bottom: 10px;">
                                <img id="customImg1" src="" style="width: 100%; border-radius: 8px; background: rgba(255,255,255,0.05); aspect-ratio: 1; object-fit: cover;">
                                <img id="customImg2" src="" style="width: 100%; border-radius: 8px; background: rgba(255,255,255,0.05); aspect-ratio: 1; object-fit: cover;">
                                <img id="customImg3" src="" style="width: 100%; border-radius: 8px; background: rgba(255,255,255,0.05); aspect-ratio: 1; object-fit: cover;">
                                <img id="customImg4" src="" style="width: 100%; border-radius: 8px; background: rgba(255,255,255,0.05); aspect-ratio: 1; object-fit: cover;">
                            </div>
                            <div id="customModificationsList" style="text-align: left; font-size: 0.85rem; color: #ccc; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px;">
                            </div>
                        </div>
                        <div class="product-info" style="margin-left: 0;">
                            <h3 class="product-name" style="font-size: 1.3rem; margin-bottom: 5px;"></h3>
                            <p class="product-price" style="font-size: 1.1rem; color: #C08552; font-weight: bold;"></p>
                        </div>
                    </div>
            
                    <div class="size-selection">
                        <label for="size">Select Size (6-10):</label>
                        <select id="size" class="size-select">
                            <option value="6">6</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                        </select>
                    </div>
                
                    <div class="quantity-selection">
                        <label for="quantity">Quantity:</label>
                        <input type="number" id="quantity" class="quantity-input" value="1" min="1" max="10" onchange="updateTotal()">
                    </div>
                
                    <div class="price-details">
                        <p>Total Product Price: <span class="total-price"></span></p>
                        <p>Order Total: <span class="order-total"></span></p>
                    </div>
                    <div class="buy-footer">
                        <button class="continue-btn" onclick="handleModalAction()">Confirm & Add to Cart</button>
                    </div>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHTML);

    // --- MINI CART UI INJECTION ---
    const miniCartHTML = `
    <style>
        #miniCartPopup {
            position: fixed;
            top: 70px; /* Below header */
            right: 20px;
            width: 320px;
            background: rgba(20, 20, 20, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 15px;
            z-index: 99999;
            transform: translateY(-20px);
            opacity: 0;
            visibility: hidden;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        
        #miniCartPopup.show {
            transform: translateY(0);
            opacity: 1;
            visibility: visible;
        }
        
        .mini-cart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 8px;
        }
        
        .mini-cart-header span {
            color: #fff;
            font-weight: 600;
            font-size: 1rem;
        }
        
        .mini-cart-header i {
            color: rgba(255,255,255,0.5);
            cursor: pointer;
            font-size: 1.2rem;
        }
        
        .mini-cart-body {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        
        .mini-cart-img {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 8px;
            background: rgba(255,255,255,0.05);
        }
        
        .mini-cart-details {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        
        .mini-cart-name {
            color: #fff;
            font-size: 0.9rem;
            font-weight: 500;
        }
        
        .mini-cart-price {
            color: #C08552;
            font-size: 0.85rem;
            font-weight: bold;
        }
        
        .mini-cart-checkout-btn {
            background: #e74c3c;
            color: #fff;
            border: none;
            padding: 10px;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: background 0.3s;
        }
        
        .mini-cart-checkout-btn:hover {
            background: #c0392b;
        }
    </style>
    <div id="miniCartPopup">
        <div class="mini-cart-header">
            <span><i class='bx bx-check-circle' style="color: #2ecc71; margin-right: 5px;"></i> Added to Cart</span>
            <i class='bx bx-x' onclick="document.getElementById('miniCartPopup').classList.remove('show')"></i>
        </div>
        <div class="mini-cart-body">
            <img src="" alt="Shoe" class="mini-cart-img" id="miniCartImg">
            <div class="mini-cart-details">
                <span class="mini-cart-name" id="miniCartName">Product Name</span>
                <span class="mini-cart-price" id="miniCartPrice">Rs. 0</span>
            </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 5px;">
            <button class="mini-cart-checkout-btn" style="flex: 1; background: #4CAF50; font-size: 0.9rem;" onclick="addMoreToCart()">Add to Cart</button>
            <a href="ShowAddtocart.html" class="mini-cart-checkout-btn" style="flex: 1; font-size: 0.9rem;">View Cart</a>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', miniCartHTML);
    
    // Function to add one more of the same item from the mini-cart
    window.addMoreToCart = function() {
        const nameAndSize = document.getElementById('miniCartName').innerText;
        if(cart[nameAndSize]) {
            cart[nameAndSize].quantity += 1;
            localStorage.setItem('cart', JSON.stringify(cart));
            showToast('Added one more to cart!');
        }
    };
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModalHTML);
} else {
    initModalHTML();
}

let currentModalAction = '';

// Retrieve the cart from localStorage or initialize it if it doesn't exist
var cart = JSON.parse(localStorage.getItem('cart')) || {};

let currentCustomData = null;

function populateCustomData(customData) {
    currentCustomData = customData;
    const customSection = document.getElementById('customDataSection');
    const mainImg = document.querySelector('.product-img');
    if (customData && customData.images && customData.images.length === 4) {
        mainImg.style.display = 'none';
        customSection.style.display = 'block';
        document.getElementById('customImg1').src = customData.images[0];
        document.getElementById('customImg2').src = customData.images[1];
        document.getElementById('customImg3').src = customData.images[2];
        document.getElementById('customImg4').src = customData.images[3];
        
        let modsHTML = '<h4 style="margin: 0 0 8px 0; color: #fff;">Your Modifications:</h4><ul style="margin: 0; padding-left: 20px;">';
        let hasMods = false;
        for (const [part, mods] of Object.entries(customData.modifications)) {
            const details = [];
            if (mods.color) details.push(mods.color.name);
            if (mods.material) details.push(mods.material.name);
            if (details.length > 0) {
                modsHTML += `<li><strong>${part}:</strong> ${details.join(', ')}</li>`;
                hasMods = true;
            }
        }
        modsHTML += '</ul>';
        if (!hasMods) modsHTML = '<p style="margin:0; color:#fff;">No custom modifications applied.</p>';
        document.getElementById('customModificationsList').innerHTML = modsHTML;
    } else {
        mainImg.style.display = 'block';
        customSection.style.display = 'none';
    }
}

// Redefined addToCart to open the modal instead
function addToCart(imageSrc, itemName, price, customData = null) {
    currentModalAction = 'add_to_cart';
    
    // Fix image path if it's relative
    let finalImgSrc = imageSrc;
    if(!imageSrc.startsWith('assets/') && imageSrc.includes('images/')) {
        finalImgSrc = 'assets/' + imageSrc;
    } else if (!imageSrc.startsWith('assets/') && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
        finalImgSrc = 'assets/images/' + imageSrc;
    }

    // Populate modal fields
    document.querySelector('.product-img').src = finalImgSrc;
    document.querySelector('.product-name').textContent = itemName;
    document.querySelector('.product-price').textContent = `Rs. ${price}`;
    document.querySelector('.total-price').textContent = `Rs. ${price}`;
    document.querySelector('.order-total').textContent = `Rs. ${price}`;
    if (document.querySelector('.order-total-payment')) {
        document.querySelector('.order-total-payment').textContent = `${price}`;
    }

    populateCustomData(customData);

    // Reset quantity
    document.getElementById('quantity').value = 1;
    
    // Change button text
    const btn = document.querySelector('.continue-btn');
    if(btn) {
        btn.textContent = 'Confirm';
        btn.onclick = handleModalAction;
    }

    document.getElementById('buyModal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Select Options';
    
    document.getElementById('reviewSection').style.display = 'block';
}

// Open Buy Popup
function openBuyPopup(imgSrc, productName, productPrice, customData = null) {
    currentModalAction = 'buy_now';
    const totalPrice = parseInt(productPrice.toString().replace('Rs. ', '')); 
    
    // Fix image path if it's relative
    let finalImgSrc = imgSrc;
    if(!imgSrc.startsWith('assets/') && imgSrc.includes('images/')) {
        finalImgSrc = 'assets/' + imgSrc;
    } else if (!imgSrc.startsWith('assets/') && !imgSrc.startsWith('http') && !imgSrc.startsWith('data:')) {
        finalImgSrc = 'assets/images/' + imgSrc;
    }

    // Populate modal fields
    document.querySelector('.product-img').src = finalImgSrc;
    document.querySelector('.product-name').textContent = productName;
    document.querySelector('.product-price').textContent = `Rs. ${totalPrice}`;
    document.querySelector('.total-price').textContent = `Rs. ${totalPrice}`;
    document.querySelector('.order-total').textContent = `Rs. ${totalPrice}`;
    if (document.querySelector('.order-total-payment')) {
        document.querySelector('.order-total-payment').textContent = `${totalPrice}`;
    }

    populateCustomData(customData);

    // Reset quantity
    document.getElementById('quantity').value = 1;
    
    // Change button text
    const btn = document.querySelector('.continue-btn');
    if(btn) {
        btn.textContent = 'Continue';
        btn.onclick = handleModalAction;
    }

    document.getElementById('buyModal').style.display = 'flex';
    document.getElementById('modalTitle').textContent = 'Review Your Order';
    
    document.getElementById('reviewSection').style.display = 'block';
}

function handleModalAction() {
    const selectedSize = document.getElementById('size').value;
    if (!selectedSize) {
        alert('Please select a size!');
        return;
    }
    
    // Perform actual add to cart
    const itemName = document.querySelector('.product-name').textContent;
    const price = parseInt(document.querySelector('.product-price').textContent.replace('Rs. ', ''));
    const quantity = parseInt(document.getElementById('quantity').value);
    const imageSrc = document.querySelector('.product-img').src;
    
    // Use a unique key combining name and size
    const cartKey = `${itemName} (Size: ${selectedSize})`;
    
    // Refresh cart from storage just in case
    cart = JSON.parse(localStorage.getItem('cart')) || {};

    if (cart[cartKey]) {
        cart[cartKey].quantity += quantity;
        if (currentCustomData) cart[cartKey].customData = currentCustomData;
    } else {
        cart[cartKey] = {
            imageSrc,
            price,
            quantity,
            size: selectedSize
        };
        if (currentCustomData) {
            cart[cartKey].customData = currentCustomData;
        }
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Redirect to Cart Panel directly
    window.location.href = "ShowAddtocart.html";
}
        


function closeBuyPopup() {
    document.getElementById('buyModal').style.display = 'none';
}

function updateTotal() {
    const basePrice = parseInt(document.querySelector('.product-price').textContent.replace('Rs. ', '')); 
    const quantity = parseInt(document.getElementById('quantity').value); 
    const orderTotal = basePrice * quantity; 

    document.querySelector('.total-price').textContent = `Rs. ${basePrice}`;
    document.querySelector('.order-total').textContent = `Rs. ${orderTotal}`;
    if (document.querySelector('.order-total-payment')) {
        document.querySelector('.order-total-payment').textContent = `${orderTotal}`;
    }
}

function confirmPayment() {
    const paymentMethods = document.getElementsByName('payment');
    let selectedMethod = false;

    for (let i = 0; i < paymentMethods.length; i++) {
        if (paymentMethods[i].checked) {
            selectedMethod = true;
            break;
        }
    }

    if (!selectedMethod) {
        alert('Please select a payment method!');
        return;
    }

    showToast('Payment Confirmed!');
    closeBuyPopup();
}

function showToast(message) {
    let toast = document.querySelector('.premium-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'premium-toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Trigger animation
    setTimeout(() => { toast.classList.add('show'); }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}


// Sidebar Menu Functions
function openNav() {
    const panel = document.getElementById("mySidepanel");
    if (panel) panel.style.width = "250px";
}

function closeNav() {
    const panel = document.getElementById("mySidepanel");
    if (panel) panel.style.width = "0";
}


// Initialize Tawk.to Chat Bot globally
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src="https://embed.tawk.to/6a7547d4941ab01d456d7589/1jvd2165r";
s1.charset="UTF-8";
s1.setAttribute("crossorigin","*");
if(s0 && s0.parentNode) {
    s0.parentNode.insertBefore(s1,s0);
} else {
    document.head.appendChild(s1);
}
})();
