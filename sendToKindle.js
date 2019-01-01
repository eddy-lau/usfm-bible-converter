/*jshint esversion: 6 */
var nodemailer = require('nodemailer');


const from = 'eddy.lau@gmail.com';

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: from,
    pass: 'covocwaeazicetwb'
  }
});

var mailOptions = {
  from: from,
  to: 'eddy.lau_kindle@kindle.com',
  subject: 'rcuv.mobi',
  text: 'Dummy text required by Kindle.\n',
  attachments: [
    {
      filename: 'rcuv.mobi',
      path: __dirname + '/rcuv.mobi'
    }
  ]
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
