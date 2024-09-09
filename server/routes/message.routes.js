const express = require("express");
const axios = require("axios");
const {redisConnection} = require("../middlewares/redisMiddlewares")
const {google} = require("googleapis")
require("dotenv").config();
// const {createConfig} = require("../controllers/config");
const OpenAI = require("openai");
const {sendMail} = require("./googleAuth.routes");

const { OAuth2Client } = require("google-auth-library");

const oAuth2Client = new OAuth2Client({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});

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


const messageRouter = express.Router();
messageRouter.use(express.json());

messageRouter.post("/send-mail", async(req,res)=>{
    try{ 
    const data = await sendMail(req.body);
    res.status(200).json({msg:"Email Sent Succesfully", data});
    }
    catch(err){
        console.log(err);
        res.status(400).json({error:err});
    }
})


messageRouter.get("/all-draft/:email", async(req,res)=>{
    try{
       const URL = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/drafts`;
       const token = await redisConnection.get(req.params.email);
       console.log(token);
       if(!token){
        return res.send("Token Not Found")
       }
      const config = createConfig(URL, token);
      const response = await axios(config);
      res.json(response.data);
    }
    catch(err){
        res.send(err.message);
        console.log("Can't get drafts ", err);
    }
});


messageRouter.get("/read-mail/:email/message/:message", async(req,res)=>{
    try{
      
       const URL = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages/${req.params.message}`;
       const token = await redisConnection.get(req.params.email);
       console.log(token);
       if(!token){
        return res.send("Token Not Found")
       }
      const config = createConfig(URL, token);
      const response = await axios(config);
      res.json(response.data);
    }
    catch(err){
        res.send(err.message);
        console.log("Can't get drafts ", err);
    }
});

messageRouter.get("/getMail/:email", async (req, res) => {
    try {
      const url = `https://gmail.googleapis.com/gmail/v1/users/${req.params.email}/messages?maxResults=50`;
      const token = await redisConnection.get(req.params.email);
      if (!token) {
        return res.send("Token not found");
      }
      const config = createConfig(url, token);
      const response = await axios(config);
      res.json(response.data);
    } catch (error) {
      res.send(error.message);
      console.log("Can't get emails ", error.message);
    }
  });


// GET USER INFORMATION
messageRouter.get("/userData/:email", async (req, res) => {
  try {
    let { email } = req.params;
    let accessToken = await redisConnection.get(email);

    // Log the access token and URL to ensure they are correct
    console.log("Access Token:", accessToken);
    const url = `https://gmail.googleapis.com/gmail/v1/users/${email}/profile`;
    console.log("Request URL:", url);

    const response = await axios.get(url, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`
      }
    });

    // Log the full response to inspect it
    console.log("Response:", response);

    res.status(200).json(response.data);
  } catch (err) {
    console.log("Error:", err.message);
    // Send error details and status code
    res.status(400).json({ error: err.message });
  }
});


// Creating Labels for mails
messageRouter.post("/createLabel/:email", async(req,res)=>{
  try{
     const {email} = req.params;
     const accessToken = await redisConnection.get(email);
     let label = req.body;
     console.log(label);
     let response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${email}/labels`,label,{
      headers: {
        "Content-Type":"application/json",
        "Authorization":`Bearer ${accessToken}`
      }
     })
     res.status(200).json(response.data);
  }
  catch(err){
    console.log(err);
    res.status(400).json({err})
  }
})
// ADD LABEL 
messageRouter.post("/addLabel/:email/messages/:id",async(req,res)=>{
  try {
      let {email,id} = req.params
      
      let access_token = await redisConnection.get(email)
      
      let response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${id}/modify`,req.body,{
          headers:{
              "Content-Type" : "application/json",
              "Authorization" :`Bearer ${access_token}`
          }
      })
      res.status(200).json(response.data)
  } catch (error) {
      console.log(error)
      res.status(400).json({Error:"Error while adding label to message"})
  }
})


messageRouter.get("/getLabel/:email/:labelId", async (req, res) => {
  try {
    const { email, labelId } = req.params;
    const accessToken = await redisConnection.get(email);

    const response = await axios.get(
      `https://gmail.googleapis.com/gmail/v1/users/${email}/labels/${labelId}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      }
    );

    res.status(200).json(response.data);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});


// ADDING A LABEL
messageRouter.post("/addLabel/:email/messages/:id",async(req,res)=>{
  try {
      let {email,id} = req.params
      let accessToken = await redisConnection.get(email)
      
      let response = await axios.post(`https://gmail.googleapis.com/gmail/v1/users/${email}/messages/${id}/modify`,req.body,{
          headers:{
              "Content-Type" : "application/json",
              "Authorization" :`Bearer ${accessToken}`
          }
      })
      res.status(200).json(response.data)
  } catch (err) {
      console.log(err)
      res.status(400).json({Error:"Error"})
  }
})

module.exports = {
    messageRouter
}
