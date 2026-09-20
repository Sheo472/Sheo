
// ............................................. NAVBAR SIDE PANEL ......................................................................... //


function openNav() {
    document.getElementById("mySidepanel").style.width = "250px";
  }
  
  function closeNav() {
    document.getElementById("mySidepanel").style.width = "0";
  }


// ................................................ MOVING HEADLINE ........................................................................ //
if (typeof gsap !== 'undefined') {
  var tl = gsap.timeline()
  tl.from(".main-page-content",{
      opacity:0,
      duration:1.5,
      delay:0.5,
      x:-100,
      stagger:1,
  })

  tl.from(".main-page-img",{
      opacity:0,
      duration:1.5,
      delay:0.5
  })

  gsap.from(".headline",{
      x:-1000,
      duration:2,
      repeat:-1,
      delay:-1
  })

  gsap.to(".headline",{
      x:1000,
      duration:2,
      repeat:-1,
      delay:-1
  })

  gsap.from(".headline2",{
      x:1000,
      duration:2,
      repeat:-1,
      delay:-1
      
  })

  gsap.to(".headline2",{
      x:-1000,
      duration:2,
      repeat:-1,
      delay:-1
      
  })
}


// ................................................... VIDEO SROLL HOME PAGE .............................................................. //

function scrollVideos(direction) {
  let container = document.querySelector(".shop-videos");
  let scrollAmount = 300; // Adjust based on your layout
  container.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
}


function toggleFAQ(button) {
  let answer = button.parentElement.nextElementSibling;
  if (answer.style.display === "none" || answer.style.display === "") {
      answer.style.display = "block";
  } else {
      answer.style.display = "none";
  }
}

// .................................................. MOUSE PLAY ON CURSOR ENTRY ................................................. //
const videos = document.querySelectorAll(".hov");

    videos.forEach(video => {
      
      video.addEventListener("mouseenter", () => {
        video.play();
      });

      video.addEventListener("mouseleave", () => {
        video.pause();
      });
    });

// ............................................... ADD TO CART ......................................................................... //




    // Retrieve the cart from localStorage or initialize it if it doesn't exist
var cart = JSON.parse(localStorage.getItem('cart')) || {};

// Function to add an item to the cart
function addToCart(imageSrc, itemName, price) {
  // Check if the item already exists in the cart
  if (cart[itemName]) {
    // Increment the quantity if the item exists
    cart[itemName].quantity += 1;
  } else {
    // Add a new item to the cart
    cart[itemName] = {
      imageSrc,
      price,
      quantity: 1,
    };
  }

  // Save the updated cart to localStorage
  localStorage.setItem('cart', JSON.stringify(cart));

  // Notify the user
  alert(`${itemName} has been added to the cart.`);
}




// ................................... BUY NOW POPUP PAGE ............................................................... .............//



 
// ............................................................. LOGIN PAGE .........................................................//


// Logine page //
  // Function to show login form and hide signup form
  function showLogin() {
    document.getElementById("loginForm").classList.remove("hidden");
    document.getElementById("signupForm").classList.add("hidden");
  }
  
  // Function to show signup form and hide login form
  function showSignup() {
    document.getElementById("signupForm").classList.remove("hidden");
    document.getElementById("loginForm").classList.add("hidden");
  }
  
  // Login form validation
  function validateLogin() {
    let email = document.getElementById("login-email").value;
    let password = document.getElementById("login-password").value;
  
    if (email === "" || password === "") {
        alert("All fields are required!");
        return false;
    }
    return true;
  }
  
  // Signup form validation
  function validateSignup() {
    let email = document.getElementById("signup-email").value;
    let password = document.getElementById("signup-password").value;
    let confirmPassword = document.getElementById("confirm-password").value;
  
    if (email === "" || password === "" || confirmPassword === "") {
        alert("All fields are required!");
        return false;
    }
  
    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return false;
    }
    return true;
  }

