const mongoose = require('mongoose');
require('dotenv').config();

// Problem Schema
const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const Problem = mongoose.model('Problem', problemSchema);

const sampleProblems = [
  {
    title: "Hello World",
    description: "Write a program that prints 'Hello World' to the console.",
    input: "",
    expectedOutput: "Hello World"
  },
  {
    title: "Number Pattern",
    description: "Write a program that prints a number pattern. For n=5, print:\n1\n1 2\n1 2 3\n1 2 3 4\n1 2 3 4 5",
    input: "5",
    expectedOutput: "1 \n1 2 \n1 2 3 \n1 2 3 4 \n1 2 3 4 5"
  },
  {
    title: "Sum of Two Numbers",
    description: "Write a program that takes two numbers as input and returns their sum.",
    input: "5\n3",
    expectedOutput: "8"
  },
  {
    title: "Even or Odd",
    description: "Write a program that takes a number as input and determines if it's even or odd.",
    input: "7",
    expectedOutput: "Odd"
  },
  {
    title: "Factorial",
    description: "Write a program that calculates the factorial of a given number.",
    input: "5",
    expectedOutput: "120"
  },
  {
    title: "Fibonacci Sequence",
    description: "Write a program that generates the first n numbers of the Fibonacci sequence.",
    input: "7",
    expectedOutput: "0 1 1 2 3 5 8"
  },
  {
    title: "Palindrome Check",
    description: "Write a program that checks if a given string is a palindrome.",
    input: "racecar",
    expectedOutput: "Yes"
  },
  {
    title: "Array Sum",
    description: "Write a program that calculates the sum of all elements in an array.",
    input: "1 2 3 4 5",
    expectedOutput: "15"
  },
  {
    title: "Prime Number Check",
    description: "Write a program that checks if a given number is prime.",
    input: "17",
    expectedOutput: "Prime"
  }
];

async function seedProblems() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecompiler', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing problems
    await Problem.deleteMany({});
    console.log('Cleared existing problems');

    // Insert sample problems
    await Problem.insertMany(sampleProblems);
    console.log('Sample problems inserted successfully!');

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error seeding problems:', error);
    process.exit(1);
  }
}

// Run the seeder
seedProblems();