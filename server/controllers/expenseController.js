// Load environment variables from .env file
require('dotenv').config();
const { Op } = require('sequelize');
// Import required packages and models
const jwt = require('jsonwebtoken');
const Sequelize = require('sequelize');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Expense = require('../models/expense');
const sequelize = require('../config/sequelize');



const addExpense = async (req, res) => {
    const t = await sequelize.transaction(); // Start a new transaction
    try {
        const { amount, description, date, category } = req.body;
        const userId = req.user.id;

        // Create a new expense and associate it with the user within the transaction
        const expense = await Expense.create({
            amount,
            description,
            date,
            category,
            userId,
        }, { transaction: t });

        // Update the user's totalExpense field within the transaction
        const user = await User.findByPk(userId, { transaction: t });
        await user.increment('totalExpense', { by: amount, transaction: t });

        await t.commit(); // Commit the transaction if all the operations succeed

        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        await t.rollback(); // Rollback the transaction if an error occurs
        res.status(500).json({ message: "Server error" });
    }
};



const getExpensesByUser = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        // Find all expenses for the user
        const expense = await Expense.findAll({ where: { userId } });
        res.status(201).json(expense);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};


const getTotalExpense = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['username', 'totalExpense']
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }

};





//const { sequelize, User, Expense } = require('../models');

const deleteExpense = async (req, res) => {
    const expenseId = req.params.expenseId;
    const token = req.headers.authorization.split(' ')[1];

    try {
        await sequelize.transaction(async (t) => {
            // Verify the token and decode the user details
            const decoded = jwt.verify(token, 'mySecretKey');
            const userId = decoded.id;

            // Find the user and decrement total expense by the expense amount
            const [user] = await User.update({ totalExpense: sequelize.literal(`totalExpense - (SELECT amount FROM Expenses WHERE id = ${expenseId})`) }, {
                where: { id: userId },
                returning: true,
                transaction: t,
            });

            // Find the expense by ID and check if it belongs to the user
            const expense = await Expense.findOne({
                where: {
                    id: expenseId,
                    userId: userId,
                },
                transaction: t,
            });

            if (!expense) {
                throw new Error('Expense not found');
            }

            // Delete the expense
            await expense.destroy({ transaction: t });

            res.status(200).json({ message: 'Expense deleted successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};




module.exports = {
    addExpense,
    getExpensesByUser,
    getTotalExpense,
    deleteExpense
}