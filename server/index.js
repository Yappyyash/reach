const express = require("express");
const session = require("express-session");
const {googleRouter} = require("./routes/googleAuth.routes");
const {messageRouter} = require("./routes/messageroutes");
const {mailRouter} = require("./routes/sendmail.routes")
// const {outlookRouter} = require("./routes/outlook.auth");
// const {outlookmailRouter} = require("./routes/outlook.mail.queue.route");
// const {outlookMailRouter} = require("./routes/sendMailOutlook")
const cors = require("cors");
const app = express();
app.use(session({
    secret: "any_secret_key",
    resave: false,
    saveUninitialized: false,
  }));
  app.set('view engine', 'ejs');

  app.get("/", (req, res) => {
    res.redirect('https://documenter.getpostman.com/view/31788909/2sA35HX1Y1');
  });
app.use(cors());
app.use(express.json())
app.use("/", googleRouter);
// app.use("/outlook", outlookRouter);
app.use("/mail", mailRouter);
// app.use("/outlook-mail",outlookMailRouter)
// app.use("/outlookmail",outlookMailRouter)
app.use("/api/mail", messageRouter);

app.listen("3000",()=>{
    console.log("Server is running on PORT 3000")
})