/*jshint esversion: 6 */
var nodemailer = require('nodemailer');



var transporter = nodemailer.createTransport({
  service: 'Zoho',
  auth: {
    user: 'eddie@ktc.hk',
    pass: '1Gelia23'
  }
});

var mailOptions = {
  from: 'eddie@ktc.hk',
  to: 'eddy.lau_kindle@kindle.com',
  attachments: [
    {
      filename: 'rcuv.mobi',
      path: __dirname + '/rcuv.mobi'
    }
  ]
};

transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
