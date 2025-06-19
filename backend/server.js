const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codecompiler', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Problem Schema
const problemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  input: { type: String, default: '' },
  expectedOutput: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// Code Schema
const codeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Problem = mongoose.model('Problem', problemSchema);
const Code = mongoose.model('Code', codeSchema);

// Create temp directory for code execution
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Helper function to execute code with better input handling
const executeCode = (code, language, input = '') => {
  return new Promise((resolve, reject) => {
    const timestamp = Date.now();
    let fileName, command;
    let useSpawn = false; // Flag to determine if we should use spawn for better input handling

    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        fileName = `code_${timestamp}.js`;
        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, code);
        command = ['node', filePath];
        useSpawn = true;
        break;
      
      case 'python':
      case 'py':
        fileName = `code_${timestamp}.py`;
        const pyFilePath = path.join(tempDir, fileName);
        fs.writeFileSync(pyFilePath, code);
        command = ['python', '-u', pyFilePath];
        useSpawn = true;
        break;
      
      case 'java':
        fileName = `Code_${timestamp}.java`;
        const javaFilePath = path.join(tempDir, fileName);
        const javaCode = code.replace(/public class \w+/, `public class Code_${timestamp}`);
        fs.writeFileSync(javaFilePath, javaCode);
        
        // First compile
        return new Promise((resolve) => {
          exec(`cd ${tempDir} && javac ${fileName}`, (compileError, stdout, stderr) => {
            if (compileError) {
              resolve({
                success: false,
                output: `Compilation Error:\n${stderr || compileError.message}`,
                error: true
              });
              return;
            }
            
            // Then run with spawn for better input handling
            const child = spawn('java', [`Code_${timestamp}`], { 
              cwd: tempDir,
              timeout: 10000 
            });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
              output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
              errorOutput += data.toString();
            });
            
            // Send input if provided
            if (input && input.trim()) {
              const inputLines = input.trim().split('\n');
              inputLines.forEach(line => {
                child.stdin.write(line + '\n');
              });
            }
            child.stdin.end();
            
            child.on('close', (code) => {
              // Cleanup
              try {
                const classFile = path.join(tempDir, `Code_${timestamp}.class`);
                const javaFile = path.join(tempDir, fileName);
                if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
                if (fs.existsSync(javaFile)) fs.unlinkSync(javaFile);
              } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
              }
              
              if (code === 0) {
                resolve({
                  success: true,
                  output: output.trim(),
                  error: false
                });
              } else {
                resolve({
                  success: false,
                  output: errorOutput || 'Program exited with error',
                  error: true
                });
              }
            });
            
            child.on('error', (error) => {
              resolve({
                success: false,
                output: error.message,
                error: true
              });
            });
          });
        });
      
      case 'cpp':
      case 'c++':
        fileName = `code_${timestamp}.cpp`;
        const cppFilePath = path.join(tempDir, fileName);
        const exeName = `code_${timestamp}`;
        const exePath = path.join(tempDir, exeName);
        fs.writeFileSync(cppFilePath, code);
        
        // First compile
        return new Promise((resolve) => {
          exec(`g++ ${cppFilePath} -o ${exePath}`, (compileError, stdout, stderr) => {
            if (compileError) {
              resolve({
                success: false,
                output: `Compilation Error:\n${stderr || compileError.message}`,
                error: true
              });
              return;
            }
            
            // Then run with spawn
            const child = spawn(exePath, [], { timeout: 10000 });
            
            let output = '';
            let errorOutput = '';
            
            child.stdout.on('data', (data) => {
              output += data.toString();
            });
            
            child.stderr.on('data', (data) => {
              errorOutput += data.toString();
            });
            
            // Send input if provided
            if (input && input.trim()) {
              const inputLines = input.trim().split('\n');
              inputLines.forEach(line => {
                child.stdin.write(line + '\n');
              });
            }
            child.stdin.end();
            
            child.on('close', (code) => {
              // Cleanup
              try {
                if (fs.existsSync(cppFilePath)) fs.unlinkSync(cppFilePath);
                if (fs.existsSync(exePath)) fs.unlinkSync(exePath);
              } catch (cleanupError) {
                console.error('Cleanup error:', cleanupError);
              }
              
              if (code === 0) {
                resolve({
                  success: true,
                  output: output.trim(),
                  error: false
                });
              } else {
                resolve({
                  success: false,
                  output: errorOutput || 'Program exited with error',
                  error: true
                });
              }
            });
            
            child.on('error', (error) => {
              resolve({
                success: false,
                output: error.message,
                error: true
              });
            });
          });
        });
      
      default:
        return resolve({
          success: false,
          output: 'Unsupported language',
          error: true
        });
    }

    if (useSpawn) {
      // Use spawn for better input/output handling
      const child = spawn(command[0], command.slice(1), { 
        timeout: 10000,
        cwd: tempDir 
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      // Send input if provided
      if (input && input.trim()) {
        const inputLines = input.trim().split('\n');
        inputLines.forEach(line => {
          child.stdin.write(line + '\n');
        });
      }
      child.stdin.end();
      
      child.on('close', (code) => {
        // Cleanup temp files
        try {
          const tempFile = path.join(tempDir, fileName);
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
        }
        
        if (code === 0) {
          resolve({
            success: true,
            output: output.trim(),
            error: false
          });
        } else {
          resolve({
            success: false,
            output: errorOutput || 'Program exited with error',
            error: true
          });
        }
      });
      
      child.on('error', (error) => {
        if (error.code === 'TIMEOUT') {
          resolve({
            success: false,
            output: 'Error: Code execution timed out (10 seconds limit)',
            error: true
          });
        } else {
          resolve({
            success: false,
            output: error.message,
            error: true
          });
        }
      });
    }
  });
};

// Routes

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const problems = await Problem.find().sort({ createdAt: -1 });
    res.json(problems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single problem
app.get('/api/problems/:id', async (req, res) => {
  try {
    const problem = await Problem.findById(req.params.id);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json(problem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new problem
app.post('/api/problems', async (req, res) => {
  try {
    const problem = new Problem(req.body);
    await problem.save();
    res.status(201).json(problem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Execute code
app.post('/api/execute', async (req, res) => {
  try {
    const { code, language, input } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    const result = await executeCode(code, language || 'javascript', input);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      output: error.message, 
      error: true 
    });
  }
});

// Get all saved codes
app.get('/api/codes', async (req, res) => {
  try {
    const codes = await Code.find()
      .populate('problemId', 'title')
      .sort({ updatedAt: -1 });
    res.json(codes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single code
app.get('/api/codes/:id', async (req, res) => {
  try {
    const code = await Code.findById(req.params.id).populate('problemId', 'title');
    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }
    res.json(code);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save/Add new code
app.post('/api/codes', async (req, res) => {
  try {
    const code = new Code(req.body);
    await code.save();
    res.status(201).json(code);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update code
app.put('/api/codes/:id', async (req, res) => {
  try {
    const code = await Code.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }
    res.json(code);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete code
app.delete('/api/codes/:id', async (req, res) => {
  try {
    const code = await Code.findByIdAndDelete(req.params.id);
    if (!code) {
      return res.status(404).json({ error: 'Code not found' });
    }
    res.json({ message: 'Code deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});