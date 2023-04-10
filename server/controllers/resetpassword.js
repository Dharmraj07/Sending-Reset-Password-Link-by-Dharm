const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/user");
const bcrypt = require('bcryptjs');

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user) {
      return res.status(400).send('Email address not found');
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await user.update({ resetPasswordToken: token });

    const transporter = nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    const resetPasswordUrl = `${req.protocol}://${req.get('host')}/resetpassword/${token}`;
    const message = {
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: 'Password Reset Request',
      html: `<p>You have requested to reset your password. Please click on the link below to reset your password:</p>
            <a href="${resetPasswordUrl}">Reset Password</a>`
    };

    await transporter.sendMail(message);
    res.status(200).send('Password reset email sent successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error sending password reset email');
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({ where: { resetPasswordToken: token } });

    if (!user) {
      return res.status(400).send('Invalid password reset token');
    }

    //res.render('resetpassword', { token });
    const html = `
      <h1>Reset Password</h1>
      <form method="POST" action="http://localhost:8000/updatepassword">
        <input type="hidden" name="token" value="${token}">
        <label for="password">New Password:</label>
        <input type="password" id="password" name="password" required>
        <button type="submit">Update Password</button>
      </form>
    `;
    
    res.send(html);
res.end()

  } catch (error) {
    console.error(error);
    res.status(500).send('Error resetting password');
  }
};

const updatePassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ where: { resetPasswordToken: token } });

    if (!user) {
      return res.status(400).send('Invalid password reset token');
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await user.update({ password:hashedPassword , resetPasswordToken: null});


    res.status(200).send('Password updated successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error updating password');
  }
};

module.exports = { forgotPassword, resetPassword, updatePassword };
