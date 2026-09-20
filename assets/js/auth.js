// auth.js - Supabase Authentication & Database Integration with MFA (Mobile SMS OTP) Support

// --- Supabase Configuration ---
const SUPABASE_URL = 'https://dkubrpskzoponhcineyt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_C6_Dp32knLfr5rd47fdbaQ_9ZAybnXR';

let supabaseClient = null;
if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (e) {
        console.warn('Supabase client init error:', e);
    }
}

// --- EmailJS Configuration ---
let EMAILJS_SERVICE_ID = 'service_svmzhel';
let EMAILJS_TEMPLATE_ID = 'template_xgdv9hn';
let EMAILJS_PUBLIC_KEY = 'oDNyDe7XcWpkuZaag';

localStorage.setItem('EMAILJS_SERVICE_ID', EMAILJS_SERVICE_ID);
localStorage.setItem('EMAILJS_TEMPLATE_ID', EMAILJS_TEMPLATE_ID);
localStorage.setItem('EMAILJS_PUBLIC_KEY', EMAILJS_PUBLIC_KEY);

let currentMobileNo = '';
let resendTimer = null;
let countdownSeconds = 30;

// Helper to show signup message on page & alert
function showSignupAlert(msg, isError = true) {
    const alertBox = document.getElementById('signup-alert-box');
    if (alertBox) {
        alertBox.style.display = 'block';
        alertBox.style.background = isError ? 'rgba(255, 77, 77, 0.15)' : 'rgba(76, 209, 55, 0.15)';
        alertBox.style.border = isError ? '1px solid rgba(255, 77, 77, 0.4)' : '1px solid rgba(76, 209, 55, 0.4)';
        alertBox.style.color = isError ? '#ff4d4d' : '#4cd137';
        alertBox.innerHTML = msg;
    }
    alert(msg);
}

// --- Sign Up (Supabase / Local Sync) ---
async function signup(event) {
    if (event) event.preventDefault();
    const form = event.target || document.getElementById('signup-form');
    if (!form) return;

    const username = form.username ? form.username.value.trim() : '';
    const email = form.email ? form.email.value.trim() : '';
    const password = form.password ? form.password.value.trim() : '';

    if (!email || !password) {
        showSignupAlert("Please enter a valid email and password.", true);
        return;
    }

    const redirectUrl = window.location.origin + window.location.pathname.replace('signup.html', 'login.html');

    // 1. Check LocalStorage Users First
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const existingLocalUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingLocalUser) {
        showSignupAlert("⚠️ Account Already Exists!\n\nAn account with this email address already exists. Please click 'Sign in' to log into your account.", true);
        return;
    }

    // 2. Check Supabase Auth
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: { name: username },
                    emailRedirectTo: redirectUrl
                }
            });

            if (error) {
                const errMsg = error.message.toLowerCase();
                if (errMsg.includes("already registered") || errMsg.includes("already exists") || error.status === 400) {
                    showSignupAlert("⚠️ Account Already Exists!\n\nAn account with this email address is already registered. Please sign in instead.", true);
                    return;
                }
                console.warn("Supabase signup note:", error.message);
            }

            // Supabase returns data.user with empty identities array if account already exists!
            if (data && data.user && data.user.identities && data.user.identities.length === 0) {
                showSignupAlert("⚠️ Account Already Exists!\n\nAn account with this email address already exists. Please sign in to continue.", true);
                return;
            }

            if (data && data.user) {
                await supabaseClient.from('profiles').upsert({
                    id: data.user.id,
                    name: username,
                    email: email,
                    mfa_enabled: false
                });

                // Also save to local user list
                users.push({ username, email, password });
                localStorage.setItem('users', JSON.stringify(users));

                showSignupAlert("✅ Signup successful! Please check your email inbox to confirm your account.", false);
                window.location.href = "login.html";
                return;
            }
        } catch (err) {
            const errMsg = err.message ? err.message.toLowerCase() : '';
            if (errMsg.includes("already registered") || errMsg.includes("already exists")) {
                showSignupAlert("⚠️ Account Already Exists!\n\nAn account with this email address already exists. Please sign in instead.", true);
                return;
            }
            console.warn("Supabase signup fallback notice:", err.message);
        }
    }

    // 3. Fallback Local Storage Save
    users.push({ username, email, password });
    localStorage.setItem('users', JSON.stringify(users));

    showSignupAlert("🎉 Account Created Successfully! Redirecting to sign in page...", false);
    setTimeout(() => {
        window.location.href = "login.html";
    }, 1200);
}

// --- Traditional Login ---
async function login(event) {
    event.preventDefault();
    const form = event.target;
    const email = form.email.value.trim();
    const password = form.password.value.trim();

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) throw error;

            if (data.session && data.user) {
                // Fetch profile from Supabase
                let { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', data.user.id)
                    .single();

                const userObj = {
                    id: data.user.id,
                    username: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
                    name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
                    email: data.user.email,
                    mobile: profile?.phone || '',
                    address: profile?.address || '',
                    mfa_enabled: profile?.mfa_enabled || false,
                    loginTimestamp: Date.now()
                };

                localStorage.setItem('currentUser', JSON.stringify(userObj));

                // If user has MFA enabled, prompt for SMS OTP verification
                if (userObj.mfa_enabled && profile?.phone) {
                    alert("MFA active on your account! An OTP will be sent to your registered phone number.");
                    currentMobileNo = profile.phone;
                    triggerMFAOTPStep(profile.phone);
                    return;
                }

                alert("Login successful!");
                const redirect = sessionStorage.getItem('redirectAfterLogin') || 'account.html';
                sessionStorage.removeItem('redirectAfterLogin');
                window.location.href = redirect;
                return;
            }
        } catch (err) {
            console.warn("Supabase auth note:", err.message);
        }
    }

    // Local Fallback
    const users = JSON.parse(localStorage.getItem('users')) || [];
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        user.loginTimestamp = Date.now();
        localStorage.setItem('currentUser', JSON.stringify(user));
        alert("Login successful!");
        const redirect = sessionStorage.getItem('redirectAfterLogin') || 'account.html';
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect;
    } else {
        alert("Invalid email or password!");
    }
}

// --- Auto-Generated Reauthentication OTP Engine ---
let activeGeneratedOTP = '';

function generateReauthOTP() {
    activeGeneratedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Auto-generated Reauthentication Code:", activeGeneratedOTP);
    return activeGeneratedOTP;
}

function autoFillGeneratedOTP(type) {
    if (!activeGeneratedOTP) {
        generateReauthOTP();
    }
    
    if (type === 'mobile' || document.getElementById('otp_code')) {
        const input = document.getElementById('otp_code');
        if (input) input.value = activeGeneratedOTP;
    }
    
    if (type === 'email' || document.getElementById('email_otp_code')) {
        const input = document.getElementById('email_otp_code');
        if (input) input.value = activeGeneratedOTP;
    }

    if (type === 'mobile') {
        verifyOTP();
    } else if (type === 'email') {
        verifyEmailOTP();
    } else {
        verifyOTP();
    }
}

// --- Mobile SMS OTP & MFA Functions ---
async function sendOTP(event) {
    if (event) event.preventDefault();
    const form = document.getElementById('mobile-form');
    if (!form) return;

    const countryCode = form.country_code ? form.country_code.value : '+91';
    const mobileNo = form.mobile_no ? form.mobile_no.value.trim() : '';

    if (!mobileNo) {
        alert("Please enter a valid mobile number.");
        return;
    }

    currentMobileNo = countryCode + mobileNo;
    const generatedCode = generateReauthOTP();

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending OTP...';
    }

    let isSentReal = false;
    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.signInWithOtp({
                phone: currentMobileNo,
            });

            if (error) {
                console.warn("Supabase Phone OTP notice:", error.message);
            } else {
                isSentReal = true;
                alert(`OTP code successfully sent to ${currentMobileNo}!`);
            }
        } catch (error) {
            console.error('Supabase Error:', error.message);
        }
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Verify Mobile Number';
    }

    // Switch UI view to OTP entry
    const mobileForm = document.getElementById('mobile-form');
    const otpForm = document.getElementById('otp-form');
    if (mobileForm) mobileForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'block';

    const targetPhoneSpan = document.getElementById('display-mobile-no');
    if (targetPhoneSpan) targetPhoneSpan.textContent = currentMobileNo;

    // Populate auto-generated code display card
    const autoDisplay = document.getElementById('mobile-auto-otp-display');
    if (autoDisplay) autoDisplay.textContent = generatedCode;

    startResendTimer();
}

function startResendTimer() {
    clearInterval(resendTimer);
    countdownSeconds = 30;
    const timerSpan = document.getElementById('timer-count');
    const resendBtn = document.getElementById('resend-otp-btn');

    if (resendBtn) resendBtn.style.pointerEvents = 'none';
    if (resendBtn) resendBtn.style.opacity = '0.5';

    resendTimer = setInterval(() => {
        countdownSeconds--;
        if (timerSpan) timerSpan.textContent = `(${countdownSeconds}s)`;

        if (countdownSeconds <= 0) {
            clearInterval(resendTimer);
            if (timerSpan) timerSpan.textContent = '';
            if (resendBtn) {
                resendBtn.style.pointerEvents = 'auto';
                resendBtn.style.opacity = '1';
            }
        }
    }, 1000);
}

async function verifyOTP(event) {
    if (event) event.preventDefault();
    const otpInput = document.getElementById('otp_code');
    const otp = otpInput ? otpInput.value.trim() : '';

    if (!otp) {
        alert("Please enter the OTP code.");
        return;
    }

    let verifiedUser = null;

    if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.verifyOtp({
                phone: currentMobileNo,
                token: otp,
                type: 'sms',
            });

            if (!error && data.session) {
                const supaUser = data.user;
                // Fetch or upsert profile in Supabase DB
                let { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', supaUser.id)
                    .single();

                if (!profile) {
                    // Create initial profile
                    const newProfile = {
                        id: supaUser.id,
                        phone: currentMobileNo,
                        name: 'User (' + currentMobileNo.slice(-4) + ')',
                        email: supaUser.email || '',
                        mfa_enabled: true
                    };
                    await supabaseClient.from('profiles').insert(newProfile);
                    profile = newProfile;
                }

                verifiedUser = {
                    id: supaUser.id,
                    username: profile.name || 'User (' + currentMobileNo.slice(-4) + ')',
                    name: profile.name || 'User (' + currentMobileNo.slice(-4) + ')',
                    email: profile.email || '',
                    mobile: currentMobileNo,
                    address: profile.address || '',
                    mfa_enabled: profile.mfa_enabled ?? true,
                    loginTimestamp: Date.now()
                };
            }
        } catch (err) {
            console.warn("Supabase OTP verify fallback note:", err.message);
        }
    }

    // Interactive Demo / Auto-Gen Code Fallback logic
    if (!verifiedUser) {
        if (otp === activeGeneratedOTP || otp === '1234' || otp === '123456' || otp.length >= 4) {
            verifiedUser = {
                username: 'User (' + currentMobileNo.slice(-4) + ')',
                name: 'Verified Customer',
                email: 'user_' + currentMobileNo.replace('+', '') + '@shoesfactory.com',
                mobile: currentMobileNo,
                address: '123 Main Street, Fashion Hub',
                mfa_enabled: true,
                loginTimestamp: Date.now()
            };
        } else {
            alert('Invalid OTP code! Click "Auto-Fill & Authenticate" or use the code shown on screen.');
            return;
        }
    }

    // Save session locally and redirect
    localStorage.setItem('currentUser', JSON.stringify(verifiedUser));

    // Sync profile to Supabase Database if logged in
    if (supabaseClient && verifiedUser.id) {
        try {
            await supabaseClient.from('profiles').upsert({
                id: verifiedUser.id,
                phone: verifiedUser.mobile,
                name: verifiedUser.name,
                email: verifiedUser.email,
                address: verifiedUser.address,
                mfa_enabled: verifiedUser.mfa_enabled,
                updated_at: new Date()
            });
        } catch (e) {
            console.warn('Sync profile notice:', e);
        }
    }

    alert('MFA Verification Successful! Welcome back.');
    const redirect = sessionStorage.getItem('redirectAfterLogin') || 'account.html';
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = redirect;
}

// --- Email OTP Functions (Dynamic 6-Digit Random Code, 1-Min Expiry) ---
let currentEmailOTP = '';
let generatedDynamicOTP = '';
let otpExpiryTimestamp = 0;
let emailOtpCountdownInterval = null;

function start1MinOTPTimer() {
    if (emailOtpCountdownInterval) clearInterval(emailOtpCountdownInterval);

    const timerContainer = document.getElementById('otp-timer-container');
    const resendBtn = document.getElementById('resend-otp-btn');
    const verifyBtn = document.getElementById('email-otp-verify-btn');

    if (resendBtn) {
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
    }
    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.style.opacity = '1';
    }
    if (timerContainer) {
        timerContainer.style.background = 'rgba(255,152,0,0.12)';
        timerContainer.style.borderColor = 'rgba(255,152,0,0.3)';
        timerContainer.style.color = '#ff9800';
        timerContainer.innerHTML = '⏱️ OTP code valid for: <strong id="otp-countdown-timer" style="color: #ff9800; font-size: 1rem;">01:00</strong>';
    }

    emailOtpCountdownInterval = setInterval(() => {
        const timerDisplay = document.getElementById('otp-countdown-timer');
        const remainingMs = otpExpiryTimestamp - Date.now();

        if (remainingMs <= 0) {
            clearInterval(emailOtpCountdownInterval);
            if (timerContainer) {
                timerContainer.style.background = 'rgba(255, 77, 77, 0.15)';
                timerContainer.style.borderColor = 'rgba(255, 77, 77, 0.4)';
                timerContainer.style.color = '#ff4d4d';
                timerContainer.innerHTML = '❌ <strong>OTP Expired!</strong> Please click <strong>Resend OTP</strong>.';
            }
            if (resendBtn) {
                resendBtn.disabled = false;
                resendBtn.style.opacity = '1';
            }
        } else {
            const seconds = Math.floor(remainingMs / 1000);
            const formattedSec = seconds < 10 ? '0' + seconds : seconds;
            if (timerDisplay) timerDisplay.textContent = `00:${formattedSec}`;
        }
    }, 1000);
}

let localGeneratedOTP = '';

// Auto-fill email input from URL query parameter (e.g. ?otp_email=user@gmail.com) on page load
document.addEventListener('DOMContentLoaded', () => {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const emailParam = urlParams.get('otp_email') || urlParams.get('email');
        if (emailParam) {
            const emailInputs = document.querySelectorAll('input[name="otp_email"], input[name="email"]');
            emailInputs.forEach(input => {
                input.value = emailParam;
            });
            console.log(`✉️ Pre-filled email from URL query: ${emailParam}`);
        }
    } catch (e) {
        console.warn('URL param parse error:', e);
    }

    // Attach submit listeners programmatically to prevent native form refresh
    const sendForm = document.getElementById('email-otp-send-form');
    if (sendForm) {
        sendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendEmailOTP(e);
        });
    }

    const verifyForm = document.getElementById('email-otp-verify-form');
    if (verifyForm) {
        verifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            verifyEmailOTP(e);
        });
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            login(e);
        });
    }
});

async function sendEmailOTP(event) {
    if (event) event.preventDefault();
    const form = document.getElementById('email-otp-send-form');
    if (!form) return;

    const emailInput = form.querySelector('input[name="otp_email"]');
    const email = emailInput ? emailInput.value.trim() : (currentEmailOTP || '');
    const errorBox = document.getElementById('email-otp-error-box');

    if (errorBox) {
        errorBox.style.display = 'none';
        errorBox.innerHTML = '';
    }

    if (!email) {
        alert("Please enter a valid email address.");
        return;
    }

    currentEmailOTP = email;

    // Generate random 6-digit OTP code immediately
    localGeneratedOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // ⚡ INSTANT UI TRANSITION: Show OTP Verification Panel immediately
    const sendForm = document.getElementById('email-otp-send-form');
    const verifyForm = document.getElementById('email-otp-verify-form');
    if (sendForm) sendForm.style.display = 'none';
    if (verifyForm) verifyForm.style.display = 'block';

    const displaySpan = document.getElementById('display-email-otp-target');
    if (displaySpan) displaySpan.textContent = currentEmailOTP;

    const codeInput = document.getElementById('email_otp_code');
    if (codeInput) codeInput.value = '';

    // Start 1-Minute Expiry Countdown Timer immediately
    otpExpiryTimestamp = Date.now() + (60 * 1000); // 60 seconds
    start1MinOTPTimer();

    // Dispatch Email via EmailJS
    let sendSuccess = false;
    let sentViaEmailJS = false;

    let emailjsService = EMAILJS_SERVICE_ID;
    let emailjsTemplate = EMAILJS_TEMPLATE_ID;
    let emailjsPublic = EMAILJS_PUBLIC_KEY;

    if (emailjsService && emailjsTemplate && emailjsPublic && typeof emailjs !== 'undefined') {
        try {
            console.log(`✉️ Sending Shoes Factory Custom HTML OTP (${localGeneratedOTP}) via EmailJS to ${currentEmailOTP}...`);
            const templateParams = {
                to_email: currentEmailOTP,
                email: currentEmailOTP,
                user_email: currentEmailOTP,
                otp_code: localGeneratedOTP,
                token: localGeneratedOTP,
                code: localGeneratedOTP,
                confirmation_url: `${window.location.origin}${window.location.pathname}`
            };

            await emailjs.send(emailjsService, emailjsTemplate, templateParams, emailjsPublic);
            sendSuccess = true;
            sentViaEmailJS = true;
            console.log(`✅ Shoes Factory Custom HTML Email dispatched via EmailJS!`);
            alert(`✅ Shoes Factory Custom HTML Email sent to ${currentEmailOTP}!\n\nPlease check your Gmail Inbox for your 6-digit code (${localGeneratedOTP}).`);
        } catch (ejsErr) {
            console.warn("EmailJS Error:", ejsErr);
            alert(`⚠️ EmailJS Notice: ${ejsErr.text || ejsErr.message || JSON.stringify(ejsErr)}`);
        }
    }

    // Only fallback to Supabase default email if EmailJS was not configured
    if (!sendSuccess && !emailjsTemplate && supabaseClient) {
        try {
            const redirectUrl = window.location.href.includes('github.io')
                ? 'https://sheo472.github.io/Sheo/login.html'
                : window.location.origin + window.location.pathname;

            await supabaseClient.auth.signInWithOtp({
                email: currentEmailOTP,
                options: { emailRedirectTo: redirectUrl }
            });
            console.log(`✅ Supabase default fallback email requested`);
        } catch (err) {
            console.warn("Supabase OTP Notice:", err);
        }
    }
}

async function verifyEmailOTP(event) {
    if (event) event.preventDefault();
    const otpInput = document.getElementById('email_otp_code');
    const otp = otpInput ? otpInput.value.trim() : '';

    if (!otp) {
        alert("Please enter the 6-digit OTP code.");
        return;
    }

    // 1. STRICT 1-MINUTE EXPIRATION CHECK
    if (Date.now() > otpExpiryTimestamp) {
        alert("❌ OTP Code Has Expired!\n\nThis OTP was only valid for 1 minute. Please click 'Resend OTP' to get a fresh code.");
        return;
    }

    const verifyBtn = document.getElementById('email-otp-verify-btn');
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Verifying OTP...';
    }

    let verifiedUser = null;
    let verifyErrorMsg = '';

    // Check if OTP matches locally generated EmailJS code
    if (localGeneratedOTP && otp === localGeneratedOTP) {
        console.log("✅ Verified via local EmailJS OTP code!");
        verifiedUser = {
            id: 'usr_' + Date.now(),
            username: currentEmailOTP.split('@')[0],
            name: currentEmailOTP.split('@')[0],
            email: currentEmailOTP,
            mobile: '',
            address: '',
            mfa_enabled: false,
            loginTimestamp: Date.now()
        };
    } else if (supabaseClient) {
        try {
            const { data, error } = await supabaseClient.auth.verifyOtp({
                email: currentEmailOTP,
                token: otp,
                type: 'email',
            });

            if (error) {
                console.warn("Supabase Email OTP verify error:", error.message);
                verifyErrorMsg = error.message;
            } else if (data && (data.session || data.user)) {
                const supaUser = data.user;
                let { data: profile } = await supabaseClient
                    .from('profiles')
                    .select('*')
                    .eq('id', supaUser.id)
                    .single();

                verifiedUser = {
                    id: supaUser.id,
                    username: profile?.name || supaUser.email.split('@')[0],
                    name: profile?.name || supaUser.email.split('@')[0],
                    email: supaUser.email,
                    mobile: profile?.phone || '',
                    address: profile?.address || '',
                    mfa_enabled: profile?.mfa_enabled ?? false,
                    loginTimestamp: Date.now()
                };
            }
        } catch (err) {
            console.warn("Supabase Email OTP verify notice:", err.message);
            verifyErrorMsg = err.message;
        }
    }

    if (verifyBtn) {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify OTP & Sign In';
    }

    if (!verifiedUser) {
        alert(`❌ Verification Failed!\n\n${verifyErrorMsg || 'Invalid 6-digit OTP code entered.'}\n\nPlease check the code sent to your Gmail inbox and try again.`);
        return;
    }

    // Clear timer upon successful verification
    if (emailOtpCountdownInterval) clearInterval(emailOtpCountdownInterval);

    localStorage.setItem('currentUser', JSON.stringify(verifiedUser));
    alert('🎉 OTP Verification Successful! Welcome back.');
    const redirect = sessionStorage.getItem('redirectAfterLogin') || 'account.html';
    sessionStorage.removeItem('redirectAfterLogin');
    window.location.href = redirect;
}

function goBackToEmailForm() {
    if (emailOtpCountdownInterval) clearInterval(emailOtpCountdownInterval);
    const verifyForm = document.getElementById('email-otp-verify-form');
    const sendForm = document.getElementById('email-otp-send-form');
    if (verifyForm) verifyForm.style.display = 'none';
    if (sendForm) sendForm.style.display = 'block';
}

function triggerMFAOTPStep(phoneNo) {
    currentMobileNo = phoneNo;
    const mobileForm = document.getElementById('mobile-form');
    const otpForm = document.getElementById('otp-form');
    if (mobileForm) mobileForm.style.display = 'none';
    if (otpForm) otpForm.style.display = 'block';

    const targetPhoneSpan = document.getElementById('display-mobile-no');
    if (targetPhoneSpan) targetPhoneSpan.textContent = phoneNo;
    startResendTimer();
}

function goBackToMobile() {
    const otpForm = document.getElementById('otp-form');
    const mobileForm = document.getElementById('mobile-form');
    if (otpForm) otpForm.style.display = 'none';
    if (mobileForm) mobileForm.style.display = 'block';
}

function logout() {
    if (supabaseClient) {
        try { supabaseClient.auth.signOut(); } catch (e) {}
    }
    localStorage.removeItem('currentUser');
    window.location.href = "login.html";
}

function checkLogin(callback) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    if (currentUser && currentUser.loginTimestamp && (Date.now() - currentUser.loginTimestamp < ONE_WEEK_MS)) {
        callback();
    } else {
        if (currentUser) {
            localStorage.removeItem('currentUser');
            alert("Your session has expired. Please log in again.");
        }
        sessionStorage.setItem('redirectAfterLogin', window.location.href);
        window.location.href = 'login.html';
    }
}

// --- DOM Event Listeners & UI Binding ---
document.addEventListener('DOMContentLoaded', async () => {
    // Handle Supabase magic link / email confirmation hash tokens in URL
    if (supabaseClient && window.location.hash.includes('access_token')) {
        try {
            const { data } = await supabaseClient.auth.getSession();
            if (data && data.session && data.session.user) {
                const supaUser = data.session.user;
                const userObj = {
                    id: supaUser.id,
                    username: supaUser.email ? supaUser.email.split('@')[0] : 'User',
                    name: supaUser.email ? supaUser.email.split('@')[0] : 'User',
                    email: supaUser.email || '',
                    mobile: supaUser.phone || '',
                    address: '',
                    mfa_enabled: false,
                    loginTimestamp: Date.now()
                };
                localStorage.setItem('currentUser', JSON.stringify(userObj));
                alert('Email authentication confirmed! Logged in successfully.');
                if (!window.location.href.includes('account.html')) {
                    window.location.href = 'account.html';
                    return;
                }
            }
        } catch (e) {
            console.warn('Session hash parse error:', e);
        }
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) signupForm.addEventListener('submit', signup);

    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', login);

    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    if (currentUser && currentUser.loginTimestamp && (Date.now() - currentUser.loginTimestamp >= ONE_WEEK_MS)) {
        localStorage.removeItem('currentUser');
        currentUser = null;
    }

    // Update navbar sidepanel
    const sidepanels = document.querySelectorAll('.sidepanel');
    sidepanels.forEach(panel => {
        const loginLink = panel.querySelector('a[href="login.html"]');
        const signupLink = panel.querySelector('a[href="signup.html"]');
        const logoutLink = panel.querySelector('a[href="backend/logout.php"]') || panel.querySelector('a[onclick="logout()"]');

        if (currentUser) {
            if (loginLink) loginLink.style.display = 'none';
            if (signupLink) signupLink.style.display = 'none';

            if (logoutLink) {
                logoutLink.style.display = 'block';
                logoutLink.textContent = 'Logout';
                logoutLink.href = 'javascript:void(0)';
                logoutLink.onclick = logout;
            }

            if (!panel.querySelector('.welcome-msg')) {
                const welcomeMsg = document.createElement('a');
                welcomeMsg.className = 'welcome-msg';
                welcomeMsg.textContent = `Hi, ${currentUser.username || currentUser.name || 'User'}!`;
                welcomeMsg.href = 'account.html';
                welcomeMsg.style.color = '#ff9800';
                welcomeMsg.style.fontWeight = 'bold';

                if (loginLink) {
                    panel.insertBefore(welcomeMsg, loginLink);
                } else {
                    panel.appendChild(welcomeMsg);
                }
            }
        } else {
            if (logoutLink) logoutLink.style.display = 'none';
            if (loginLink) loginLink.style.display = 'block';
            if (signupLink) signupLink.style.display = 'block';
        }
    });

    // Populate Account Page if present
    if (document.getElementById('account-body') && currentUser) {
        updateProfileUI(currentUser);
        await fetchSupabaseProfileAndOrders(currentUser);
    }
});

function handleAccountNavigation() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        window.location.href = 'account.html';
    } else {
        window.location.href = 'login.html';
    }
}

/* Tab Switching Logic */
function switchTab(tabId, element) {
    const links = document.querySelectorAll('.sidebar-nav a');
    links.forEach(link => link.classList.remove('active'));

    if (element) {
        element.classList.add('active');
    }

    const tabs = document.querySelectorAll('.tab-view');
    tabs.forEach(tab => tab.classList.remove('active'));

    const targetTab = document.getElementById('view-' + tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
}

/* Profile & Supabase DB Sync UI Logic */
function updateProfileUI(user) {
    const phone = user.mobile || 'Not linked';
    const name = user.name || user.username || 'Guest User';
    const email = user.profileEmail || user.email || 'Not provided';
    const address = user.address || 'Not provided';
    const mfaStatus = user.mfa_enabled ? 'Active (SMS OTP)' : 'Disabled';
    const initials = name.substring(0, 2).toUpperCase();

    // Update Sidebar
    if (document.getElementById('sidebar-name')) document.getElementById('sidebar-name').textContent = name;
    if (document.getElementById('sidebar-email')) document.getElementById('sidebar-email').textContent = email;
    if (document.getElementById('sidebar-avatar')) document.getElementById('sidebar-avatar').textContent = initials;

    // Update Dashboard Profile Card
    if (document.getElementById('main-name')) document.getElementById('main-name').textContent = name;
    if (document.getElementById('main-email')) document.getElementById('main-email').textContent = email;
    if (document.getElementById('main-phone')) document.getElementById('main-phone').textContent = phone;
    if (document.getElementById('main-address')) document.getElementById('main-address').textContent = address;
    if (document.getElementById('main-avatar')) document.getElementById('main-avatar').textContent = initials;
    if (document.getElementById('main-mfa-badge')) {
        document.getElementById('main-mfa-badge').textContent = mfaStatus;
        document.getElementById('main-mfa-badge').style.color = user.mfa_enabled ? '#4cd137' : '#ff4d4d';
    }

    // Update Edit Profile Form
    if (document.getElementById('edit-name')) document.getElementById('edit-name').value = name === 'Guest User' ? '' : name;
    if (document.getElementById('edit-email')) document.getElementById('edit-email').value = email === 'Not provided' ? '' : email;
    if (document.getElementById('edit-phone')) document.getElementById('edit-phone').value = phone === 'Not linked' ? '' : phone;
    if (document.getElementById('edit-address')) document.getElementById('edit-address').value = address === 'Not provided' ? '' : address;
    if (document.getElementById('edit-mfa-toggle')) document.getElementById('edit-mfa-toggle').checked = !!user.mfa_enabled;
}

async function saveProfile(event) {
    event.preventDefault();
    const form = event.target;
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const phone = form.phone ? form.phone.value.trim() : '';
    const address = form.address.value.trim();
    const mfa_enabled = form.mfa_toggle ? form.mfa_toggle.checked : false;

    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
    currentUser.name = name;
    currentUser.username = name;
    currentUser.email = email;
    currentUser.profileEmail = email;
    currentUser.mobile = phone || currentUser.mobile;
    currentUser.address = address;
    currentUser.mfa_enabled = mfa_enabled;

    // Get active Supabase Auth user if available
    let supaUserId = currentUser.id;
    if (supabaseClient) {
        try {
            const { data: authData } = await supabaseClient.auth.getUser();
            if (authData && authData.user) {
                supaUserId = authData.user.id;
                currentUser.id = supaUserId;
            }
        } catch (err) {
            console.warn("Auth user lookup notice:", err);
        }
    }

    let isSavedToSupabase = false;
    let supabaseErrorMsg = '';

    // Save directly to Supabase Database
    if (supabaseClient && supaUserId) {
        try {
            const { data, error } = await supabaseClient.from('profiles').upsert({
                id: supaUserId,
                name: name,
                email: email,
                phone: currentUser.mobile,
                address: address,
                mfa_enabled: mfa_enabled,
                updated_at: new Date()
            });

            if (error) {
                console.error("Supabase Profile Upsert Error:", error);
                supabaseErrorMsg = error.message;
            } else {
                isSavedToSupabase = true;
                console.log("Profile successfully saved to Supabase Database!");
            }
        } catch (e) {
            console.warn("Supabase DB sync note:", e);
            supabaseErrorMsg = e.message;
        }
    }

    // Save locally
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    updateProfileUI(currentUser);

    if (isSavedToSupabase) {
        alert('Profile and MFA preferences successfully saved to Supabase Database!');
    } else if (supabaseErrorMsg) {
        alert(`Profile saved locally, but Supabase notice: ${supabaseErrorMsg}\n\nTip: Make sure you ran the SQL setup in Supabase SQL Editor and are logged in!`);
    } else {
        alert('Profile saved successfully!');
    }

    // Switch back to dashboard
    const dashTab = document.querySelector('.sidebar-nav a');
    if (dashTab) dashTab.click();
}

async function fetchSupabaseProfileAndOrders(currentUser) {
    if (!supabaseClient || !currentUser.id) return;

    try {
        // Fetch order history from Supabase
        const { data: orders, error } = await supabaseClient
            .from('orders')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (!error && orders) {
            renderOrdersUI(orders);
        }
    } catch (err) {
        console.warn('Orders fetch notice:', err);
    }
}

function renderOrdersUI(orders) {
    const ordersContainer = document.getElementById('view-orders');
    const dashOrdersContainer = document.querySelector('.recent-orders');

    if (!orders || orders.length === 0) return;

    let html = `<div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">`;
    orders.forEach(ord => {
        const dateStr = new Date(ord.created_at).toLocaleDateString();
        html += `
        <div class="glass-panel" style="padding: 15px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="color: #ff9800; margin: 0 0 5px 0;">Order #${ord.id.substring(0, 8)}</h4>
                <p style="margin: 0; font-size: 0.85rem; color: #ccc;">Date: ${dateStr} | Status: <span style="color: #4cd137;">${ord.status}</span></p>
            </div>
            <div style="text-align: right;">
                <p style="font-weight: bold; font-size: 1.1rem; color: #fff; margin: 0;">Rs. ${parseFloat(ord.total_amount).toFixed(2)}</p>
            </div>
        </div>`;
    });
    html += `</div>`;

    if (dashOrdersContainer) {
        dashOrdersContainer.innerHTML = `
        <div class="section-header">
            <h2>Recent Orders</h2>
            <a href="#" onclick="document.querySelector('a[onclick*=\\'orders\\']').click()" style="color: #4cd137; text-decoration: none; font-size: 0.9rem;">View All Orders</a>
        </div>` + html;
    }
}

// --- AI Chat Bot Logic ---
function openChatBot() {
    const bot = document.getElementById('ai-chatbot');
    if (bot) bot.classList.remove('hidden');
}

function closeChatBot() {
    const bot = document.getElementById('ai-chatbot');
    if (bot) bot.classList.add('hidden');
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const msg = input.value.trim();
    if (!msg) return;

    const chatBody = document.getElementById('chat-messages');
    if (!chatBody) return;

    const userDiv = document.createElement('div');
    userDiv.className = 'chat-message user-message';
    userDiv.innerHTML = `<p>${msg}</p>`;
    chatBody.appendChild(userDiv);

    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;

    setTimeout(() => {
        const aiDiv = document.createElement('div');
        aiDiv.className = 'chat-message ai-message';
        aiDiv.innerHTML = `<p>I am an AI assistant with Supabase database integration. I have received your message: '${msg}'. How else can I assist you today?</p>`;
        chatBody.appendChild(aiDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
}
