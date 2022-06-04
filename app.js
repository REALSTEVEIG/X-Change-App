require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const exphbs = require('express-handlebars')
const path = require('path')
const nodemailer = require('nodemailer')
const port = process.env.PORT || 3001
const connectDB = require('./db/connect')

//Require security dependencies
const helmet = require('helmet')
const cors = require('cors')
const xss = require('xss-clean')
const rateLimiter = require('express-rate-limit')
 
//Begining of Oauth configuration
const { google } = require('googleapis')
const config = require('./config')
const OAuth2 = google.auth.OAuth2

const OAuth2_client = new OAuth2(config.clientId, config.clientSecret)
OAuth2_client.setCredentials( { refresh_token : config.refreshToken })
//End of Oauth configuration

const app = express()

app.engine("handlebars", exphbs.engine({extname: ".handlebars", defaultLayout: false}));
app.set('view engine', 'handlebars')

app.use('/public', express.static(path.join(__dirname, 'public')))

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//Use security dependencies
app.set('trust proxy', 1)
app.use(helmet())
app.use(cors())
app.use(xss())
app.use(rateLimiter({windowMs : 60 * 1000, max : 60}))

app.get('/', (req, res) => {
    res.render('contact')
})

app.post('/send', (req, res) => {
    const output = `
        <P>You have a new contact request</p>
        <h3>Contact Details</h3>
        <ul>
           <li>Name : ${req.body.name} </li>
           <li>Location : ${req.body.location} </li>
           <li>Email : ${req.body.email} </li>
           <li>Phone : ${req.body.phone} </li>
        </ul>
        <h3>Message</h3>
        <p>${req.body.message}</p>
    `

    const accessToken = OAuth2_client.getAccessToken
    let transporter = nodemailer.createTransport({
        service : 'gmail',
        auth : {
            type : 'OAuth2',
            user : config.user,
            clientId : config.clientId,
            clientSecret : config.clientSecret,
            refreshToken : config.refreshToken,
            accessToken : accessToken
        }
    })

    let mailOptions = {
        from : `FROM STEPHEN <${config.user}>`, // sender address
        to: `<${req.body.email}>`, // list of receivers
        subject: 'Greetings!', // Subject line
        text: `Hello ${req.body.name}. You are such an amazing person and the world needs more free spirited people like you. I just wanted to say thank you for your feedback!`, // plain text body
       // html: output // html body
    }; 

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);   
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  
        return res.render('contact', {msg:'Your message has been sent successfully. Please check your email!'});
    });

    let mailOptions2 = {        // This will send the mail to your email address
        from : `FROM STEPHEN <${config.user}>`, // sender address
        to: `<${config.user}>`, // list of receivers
        subject: `Message from ${req.body.name}!`, // Subject line
        html: output // html body
    }; 

    transporter.sendMail(mailOptions2, (error, info) => {
        if (error) {
            return console.log(error);
        }
       return console.log('Sent')
    });

  })


  const start = async () => {
      try {
          await connectDB(process.env.MONGO_URI)
          app.listen(port, () => {
              console.log(`Server started on port ${port}`)
          })
      } catch (error) {
          console.log(error)
      }
  } 

  start()