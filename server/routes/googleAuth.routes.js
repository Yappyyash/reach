const express = require("express");
require("dotenv").config();
const nodemailer = require("nodemailer")
const {OAuth2Client} = require("google-auth-library");
const {redisConnection} = require("../middlewares/redisMiddlewares")
const axios = require("axios")
const OpenAi = require("openai")

const openai = new OpenAi({apiKey:'process.env.OPENAI_API_KEY'});

const googleRouter = express.Router();

const oAuthClient = new OAuth2Client({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: process.env.REDIRECT_URI
})


googleRouter.get("/auth/google", (req, res) => {
    const authUrl = oAuthClient.generateAuthUrl({
        access_type: "offline",
        scope: [
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.compose"
        ]
    });
    res.redirect(authUrl);
});

let accessTokenForMail;
googleRouter.get("/auth/google/callback", async(req,res)=>{
    const { code } = req.query;

    try {
        const { tokens } = await oAuthClient.getToken(code);
        const accessToken = tokens.access_token;
        accessTokenForMail = accessToken;
        oAuthClient.setCredentials(tokens);

        // Get user information
        const userInfoResponse = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const user = userInfoResponse.data;
        console.log(user);
        const userEmail = userInfoResponse.data.email;
        redisConnection.set(userEmail,accessToken)
        // const acToken = await redisConnection.get(userEmail)
        // console.log(acToken);
        // res.json({
        //     success: true,
        //     message: "User authenticated successfully",
        //     user,
        //     accessToken
        // });
        res.render('dashboard', {user:user});
        // res.send("User Authenticated successfully");
    } catch (error) {
        console.error("Error retrieving access token:", error.message);
        res.status(500).send("Failed to retrieve access token");
    }
});


const sendMail = async (data) => {
    try {
        const token = accessTokenForMail
        console.log(token)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 465,
            secure: true,
            auth: {
                user: process.env.SMTP_mail,
                pass: process.env.SMTP_pass,
            },
        });
        let mailOptions = {
            from: data.from,
            to: data.to,
            subject: "Exciting Offer",
            text: "",
            html: "",
        };
        let emailContent = "Generate a mail, to mail a user about the offer and comapny in better and impressive way like around 200 words. Also ask for you are intrested or not, or they want some more information and dont mention dear name, instead say dear user.My name is Prity Rastogi and company name is Reach-In Box";
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0301",
            temperature: 0.7,
            messages: [
                {
                    role: 'user',
                    content: emailContent,
                },
            ],
        });
        // mailOptions.text = response.choices[0].message.content;
        const generatedText = response.choices[0].message.content;

        mailOptions.html=`<div style="background-color: #f5f5f5; padding: 20px; border-radius: 10px; text-align: center; font-family: Arial, sans-serif;">
        <h2 style="color: #333;">Exciting Offer from Reach-In Box!</h2>
        <p style="font-size: 16px; color: #666;">Dear valued customer,</p>
        <p style="font-size: 16px; color: #666;">${generatedText}</p>
        <p style="font-size: 16px; color: #666;">Best regards,</p>
        <p style="font-size: 16px; color: #666;"><strong>Prity Rastogi</strong><br>Reach-In Box</p>
    </div>`;
        const output = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        return output;
        
    } catch (err) {
        throw new Error("Sending Mail Failed" + err);
    }
};


const createConfig = (url, token) => {
    return {
        method: 'GET',
        url: url,
        headers: {
            Authorization: `Bearer ${token}`,  // OAuth token
            'Content-Type': 'application/json'
        }
    };
};

googleRouter.get("/all-mails/:email", async (req, res) => {
    try {
        let email = req.params.email;  // Access email from params correctly
        const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/messages?maxResults=50`;

        // Fetch token from Redis
        const token = await redisConnection.get(email);
        if (!token) {
            return res.send("Token not found, Please login again to get token");
        }

        // Create config for axios request
        const config = createConfig(url, token);

        // Log the config object to inspect it
        console.log("Config object:", config);

        // Make the axios call
        const response = await axios(config);

        // Log raw response data
        console.log("Raw response data:", response.data);

        // Ensure the response is a valid JSON object before sending
        if (typeof response.data === 'object') {
            res.json(response.data);
        } else {
            res.send("Received data is not valid JSON");
        }
    } catch (error) {
        res.send(error.message);
        console.log("Can't get emails ", error.message);
    }
});

  async function assignLabel(label, email,id ,accessToken){
    try {
        let labelOptions={
            "addLabelIds":[`${label}`]
        }
        const response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${id}/modify`,labelOptions,{
            headers:{
                "Content-Type" : "application/json",
                "Authorization" :`Bearer ${accessToken}`
            }
        })
        console.log(response.data)
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

module.exports = {
    googleRouter,sendMail, assignLabel
}