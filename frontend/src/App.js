import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [problems, setProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [userCode, setUserCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [userInput, setUserInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedCodes, setSavedCodes] = useState([]);
  const [showAddCode, setShowAddCode] = useState(false);
  const [codeTitle, setCodeTitle] = useState('');
  const [editingCode, setEditingCode] = useState(null);
  const [currentView, setCurrentView] = useState('problems');
  
  // New states for auto-completion
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const textareaRef = useRef(null);

  useEffect(() => {
    fetchProblems();
    fetchSavedCodes();
  }, []);

  const fetchProblems = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/problems`);
      setProblems(response.data);
      if (response.data.length > 0) {
        setSelectedProblem(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching problems:', error);
    }
  };

  const fetchSavedCodes = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/codes`);
      setSavedCodes(response.data);
    } catch (error) {
      console.error('Error fetching saved codes:', error);
    }
  };

  // Language-specific keywords and suggestions
  const getLanguageSuggestions = (lang) => {
    const suggestions = {
      javascript: [
        'console.log', 'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
        'require', 'module.exports', 'async', 'await', 'try', 'catch', 'finally', 'class',
        'constructor', 'extends', 'super', 'this', 'new', 'typeof', 'instanceof', 'Array',
        'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON.parse', 'JSON.stringify',
        'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'parseInt', 'parseFloat'
      ],
      python: [
        'print', 'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
        'finally', 'import', 'from', 'as', 'return', 'yield', 'lambda', 'with', 'pass',
        'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None',
        'len', 'range', 'enumerate', 'zip', 'map', 'filter', 'sorted', 'reversed',
        'str', 'int', 'float', 'list', 'dict', 'tuple', 'set', 'input'
      ],
      java: [
        'public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends',
        'implements', 'import', 'package', 'if', 'else', 'for', 'while', 'do', 'switch',
        'case', 'default', 'try', 'catch', 'finally', 'throw', 'throws', 'return',
        'new', 'this', 'super', 'void', 'int', 'double', 'float', 'long', 'short',
        'byte', 'char', 'boolean', 'String', 'System.out.println', 'Scanner', 'ArrayList',
        'HashMap', 'HashSet', 'Arrays', 'Collections'
      ],
      cpp: [
        '#include', '#define', 'using', 'namespace', 'std', 'int', 'double', 'float',
        'char', 'bool', 'void', 'string', 'vector', 'map', 'set', 'queue', 'stack',
        'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'try', 'catch',
        'throw', 'return', 'class', 'struct', 'public', 'private', 'protected',
        'cout', 'cin', 'endl', 'sizeof', 'new', 'delete', 'this', 'nullptr',
        'const', 'static', 'inline', 'virtual', 'override'
      ]
    };
    return suggestions[lang] || [];
  };

  // Auto-pairing brackets and quotes
  const getClosingChar = (char) => {
    const pairs = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
      '`': '`'
    };
    return pairs[char];
  };

  // Handle key down events for auto-completion and smart features
  const handleKeyDown = (e) => {
    const textarea = textareaRef.current;
    const { key, ctrlKey, shiftKey } = e;
    const { selectionStart, selectionEnd, value } = textarea;

    // Handle suggestions navigation
    if (showSuggestions) {
      if (key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      } else if (key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      } else if (key === 'Tab' || key === 'Enter') {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
        return;
      } else if (key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // Auto-pairing for brackets, quotes, etc.
    if (selectionStart === selectionEnd) {
      const closingChar = getClosingChar(key);
      if (closingChar) {
        e.preventDefault();
        const beforeCursor = value.substring(0, selectionStart);
        const afterCursor = value.substring(selectionEnd);
        
        // For quotes, check if we're closing an existing quote
        if ((key === '"' || key === "'" || key === '`') && afterCursor[0] === key) {
          // Move cursor past the existing quote
          const newValue = value;
          setUserCode(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
        } else {
          // Insert the pair
          const newValue = beforeCursor + key + closingChar + afterCursor;
          setUserCode(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
        }
        return;
      }
    }

    // Auto-indentation on Enter
    if (key === 'Enter') {
      e.preventDefault();
      const lines = value.substring(0, selectionStart).split('\n');
      const currentLine = lines[lines.length - 1];
      const indent = currentLine.match(/^\s*/)[0];
      
      // Add extra indentation for opening brackets
      const extraIndent = (currentLine.trim().endsWith('{') || 
                          currentLine.trim().endsWith('(') || 
                          currentLine.trim().endsWith('[')) ? '  ' : '';
      
      const beforeCursor = value.substring(0, selectionStart);
      const afterCursor = value.substring(selectionEnd);
      const newValue = beforeCursor + '\n' + indent + extraIndent + afterCursor;
      
      setUserCode(newValue);
      setTimeout(() => {
        const newPosition = selectionStart + 1 + indent.length + extraIndent.length;
        textarea.selectionStart = textarea.selectionEnd = newPosition;
      }, 0);
      return;
    }

    // Smart indentation with Tab
    if (key === 'Tab') {
      e.preventDefault();
      if (selectionStart === selectionEnd) {
        // Insert 2 spaces for indentation
        const beforeCursor = value.substring(0, selectionStart);
        const afterCursor = value.substring(selectionEnd);
        const newValue = beforeCursor + '  ' + afterCursor;
        setUserCode(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
        }, 0);
      } else {
        // Indent selected lines
        const beforeSelection = value.substring(0, selectionStart);
        const selectedText = value.substring(selectionStart, selectionEnd);
        const afterSelection = value.substring(selectionEnd);
        
        const lines = selectedText.split('\n');
        const indentedLines = shiftKey 
          ? lines.map(line => line.replace(/^  /, '')) // Unindent
          : lines.map(line => '  ' + line); // Indent
        
        const newValue = beforeSelection + indentedLines.join('\n') + afterSelection;
        setUserCode(newValue);
      }
      return;
    }

    // Ctrl+/ for comments
    if (ctrlKey && key === '/') {
      e.preventDefault();
      toggleComment();
      return;
    }
  };

  // Toggle comment for selected lines
  const toggleComment = () => {
    const textarea = textareaRef.current;
    const { selectionStart, selectionEnd, value } = textarea;
    
    const commentChar = {
      javascript: '//',
      python: '#',
      java: '//',
      cpp: '//'
    }[language] || '//';

    const beforeSelection = value.substring(0, selectionStart);
    const selectedText = value.substring(selectionStart, selectionEnd);
    const afterSelection = value.substring(selectionEnd);

    const lines = selectedText.split('\n');
    const allCommented = lines.every(line => line.trim().startsWith(commentChar));

    const toggledLines = allCommented
      ? lines.map(line => line.replace(new RegExp(`^\\s*${commentChar}\\s?`), ''))
      : lines.map(line => line.trim() ? commentChar + ' ' + line : line);

    const newValue = beforeSelection + toggledLines.join('\n') + afterSelection;
    setUserCode(newValue);
  };

  // Handle input changes and trigger suggestions
  const handleCodeChange = (e) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setUserCode(value);
    setCursorPosition(cursorPos);

    // Get word being typed
    const beforeCursor = value.substring(0, cursorPos);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    // Show suggestions if word is at least 2 characters
    if (currentWord.length >= 2) {
      const languageSuggestions = getLanguageSuggestions(language);
      const filteredSuggestions = languageSuggestions.filter(suggestion =>
        suggestion.toLowerCase().startsWith(currentWord.toLowerCase()) &&
        suggestion.toLowerCase() !== currentWord.toLowerCase()
      );

      if (filteredSuggestions.length > 0) {
        setSuggestions(filteredSuggestions.slice(0, 10)); // Limit to 10 suggestions
        setShowSuggestions(true);
        setSelectedSuggestion(0);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Apply selected suggestion
  const applySuggestion = (suggestion) => {
    const textarea = textareaRef.current;
    const { selectionStart, value } = textarea;
    
    const beforeCursor = value.substring(0, selectionStart);
    const afterCursor = value.substring(selectionStart);
    const words = beforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];
    
    const newBeforeCursor = beforeCursor.substring(0, beforeCursor.length - currentWord.length);
    const newValue = newBeforeCursor + suggestion + afterCursor;
    
    setUserCode(newValue);
    setShowSuggestions(false);
    
    setTimeout(() => {
      const newPosition = newBeforeCursor.length + suggestion.length;
      textarea.selectionStart = textarea.selectionEnd = newPosition;
      textarea.focus();
    }, 0);
  };

  const executeCode = async () => {
    if (!userCode.trim()) {
      setOutput('Please enter some code to execute.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/execute`, {
        code: userCode,
        language: language,
        input: userInput || selectedProblem?.input || ''
      });

      if (response.data.success) {
        setOutput(`Output:\n${response.data.output}`);
      } else {
        setOutput(`Error:\n${response.data.output}`);
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCode = async () => {
    if (!codeTitle.trim()) {
      alert('Please enter a title for your code.');
      return;
    }

    if (!userCode.trim()) {
      alert('Please enter some code to save.');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/codes`, {
        title: codeTitle,
        code: userCode,
        language: language,
        problemId: selectedProblem?._id
      });

      setSavedCodes([response.data, ...savedCodes]);
      setShowAddCode(false);
      setCodeTitle('');
      alert('Code saved successfully!');
    } catch (error) {
      alert('Error saving code: ' + error.message);
    }
  };

  const handleEditCode = (code) => {
    setEditingCode(code);
    setUserCode(code.code);
    setLanguage(code.language);
    setCurrentView('problems');
    setShowSuggestions(false);
  };

  const handleUpdateCode = async () => {
    if (!editingCode) return;

    try {
      const response = await axios.put(`${API_BASE_URL}/codes/${editingCode._id}`, {
        title: editingCode.title,
        code: userCode,
        language: language
      });

      setSavedCodes(savedCodes.map(code => 
        code._id === editingCode._id ? response.data : code
      ));
      setEditingCode(null);
      alert('Code updated successfully!');
    } catch (error) {
      alert('Error updating code: ' + error.message);
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Are you sure you want to delete this code?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/codes/${codeId}`);
      setSavedCodes(savedCodes.filter(code => code._id !== codeId));
      alert('Code deleted successfully!');
    } catch (error) {
      alert('Error deleting code: ' + error.message);
    }
  };

  const getLanguageTemplate = (lang) => {
    switch (lang) {
      case 'javascript':
        return `// JavaScript Code
console.log("Hello World!");

// For input, you can use readline (example below):
/*
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Enter a number: ', (answer) => {
  console.log('You entered:', answer);
  rl.close();
});
*/

// Or for simple input handling (recommended for this platform):
/*
// Put your input in the "Program Input" section below
// and read it like this:
const input = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
const lines = input.split('\\n');
const n = parseInt(lines[0]);
console.log('Number:', n);
*/`;
        
      case 'python':
        return `# Python Code
print("Hello World!")

# For input programs, provide input in the "Program Input" section below
# Example:
# n = int(input("Enter the number of rows: "))
# for i in range(1, n+1):
#     for j in range(1, i+1):
#         print(j, end=" ")
#     print()

# Simple example without input prompts:
n = 5
for i in range(1, n+1):
    for j in range(1, i+1):
        print(j, end=" ")
    print()`;
        
      case 'java':
        return `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World!");
        
        // For input programs, provide input in the "Program Input" section
        // Example:
        /*
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter a number: ");
        int n = scanner.nextInt();
        
        for(int i = 1; i <= n; i++) {
            for(int j = 1; j <= i; j++) {
                System.out.print(j + " ");
            }
            System.out.println();
        }
        scanner.close();
        */
    }
}`;
        
      case 'cpp':
        return `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World!" << endl;
    
    // For input programs, provide input in the "Program Input" section
    // Example:
    /*
    int n;
    cout << "Enter the number of rows: ";
    cin >> n;
    
    for(int i = 1; i <= n; i++) {
        for(int j = 1; j <= i; j++) {
            cout << j << " ";
        }
        cout << endl;
    }
    */
    
    return 0;
}`;
      default:
        return '';
    }
  };

  const fillSampleInput = () => {
    if (selectedProblem && selectedProblem.input) {
      setUserInput(selectedProblem.input);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Code Compiler</h1>
        <nav>
          <button 
            className={currentView === 'problems' ? 'active' : ''}
            onClick={() => setCurrentView('problems')}
          >
            Problems
          </button>
          <button 
            className={currentView === 'savedCodes' ? 'active' : ''}
            onClick={() => setCurrentView('savedCodes')}
          >
            Saved Codes ({savedCodes.length})
          </button>
        </nav>
      </header>

      <main className="main-content">
        {currentView === 'problems' ? (
          <div className="problem-section">
            <div className="problem-selector">
              <h3>Select Problem:</h3>
              <select 
                value={selectedProblem?._id || ''} 
                onChange={(e) => {
                  const problem = problems.find(p => p._id === e.target.value);
                  setSelectedProblem(problem);
                }}
              >
                {problems.map(problem => (
                  <option key={problem._id} value={problem._id}>
                    {problem.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedProblem && (
              <div className="problem-details">
                <h3>{selectedProblem.title}</h3>
                <p>{selectedProblem.description}</p>
                {selectedProblem.input && (
                  <div>
                    <strong>Sample Input:</strong>
                    <pre>{selectedProblem.input}</pre>
                  </div>
                )}
                {selectedProblem.expectedOutput && (
                  <div>
                    <strong>Expected Output:</strong>
                    <pre>{selectedProblem.expectedOutput}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="code-editor-section">
              <div className="editor-controls">
                <div className="language-selector">
                  <label>Language:</label>
                  <select 
                    value={language} 
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      if (!userCode || userCode === getLanguageTemplate(language)) {
                        setUserCode(getLanguageTemplate(e.target.value));
                      }
                      setShowSuggestions(false);
                    }}
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
                {editingCode && (
                  <div className="editing-indicator">
                    <span>✏️ Editing: {editingCode.title}</span>
                    <button onClick={() => {
                      setEditingCode(null);
                      setUserCode('');
                      setShowSuggestions(false);
                    }}>Cancel Edit</button>
                  </div>
                )}
              </div>

              <div className="code-editor-container">
                <div className="editor-help">
                  <small>
                    💡 <strong>Smart Features:</strong> Auto-completion (type & select with Tab/Enter), 
                    Auto-pairing brackets (), [], {}, quotes, Smart indentation (Tab), 
                    Toggle comments (Ctrl+/)
                  </small>
                </div>
                
                <div className="code-editor-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="code-editor"
                    value={userCode}
                    onChange={handleCodeChange}
                    onKeyDown={handleKeyDown}
                    placeholder={`Enter your ${language} code here...`}
                    rows="15"
                    spellCheck={false}
                  />
                  
                  {showSuggestions && (
                    <div className="suggestions-dropdown">
                      {suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className={`suggestion-item ${index === selectedSuggestion ? 'selected' : ''}`}
                          onClick={() => applySuggestion(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="input-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4>Program Input:</h4>
                  {selectedProblem && selectedProblem.input && (
                    <button 
                      onClick={fillSampleInput}
                      style={{
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontSize: '0.8rem'
                      }}
                    >
                      Use Sample Input
                    </button>
                  )}
                </div>
                <textarea
                  className="input-field"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Enter input for your program (if needed)..."
                  rows="4"
                />
                <small className="input-help">
                  <strong>Important:</strong> For programs that ask for input (like "Enter a number:"), 
                  provide the input values here, one per line. Don't include the prompt text, 
                  just the actual values you want to input.
                  <br />
                  <strong>Example:</strong> If your program asks "Enter the number of rows:", 
                  just type "5" here, not "Enter the number of rows: 5"
                </small>
              </div>

              <div className="action-buttons">
                <button 
                  className="submit-btn" 
                  onClick={executeCode} 
                  disabled={isLoading}
                >
                  {isLoading ? 'Running...' : 'Run Code'}
                </button>
                
                {editingCode ? (
                  <button 
                    className="update-btn" 
                    onClick={handleUpdateCode}
                  >
                    Update Code
                  </button>
                ) : (
                  <button 
                    className="add-code-btn" 
                    onClick={() => setShowAddCode(true)}
                  >
                    Save Code
                  </button>
                )}
              </div>

              {showAddCode && (
                <div className="add-code-modal">
                  <div className="modal-content">
                    <h3>Save Code</h3>
                    <input
                      type="text"
                      placeholder="Enter code title..."
                      value={codeTitle}
                      onChange={(e) => setCodeTitle(e.target.value)}
                    />
                    <div className="modal-buttons">
                      <button onClick={handleAddCode}>Save Code</button>
                      <button onClick={() => {
                        setShowAddCode(false);
                        setCodeTitle('');
                      }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="output-section">
                <h3>Output:</h3>
                <pre className="output">{output || 'Output will appear here...'}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="saved-codes-section">
            <h2>Saved Codes</h2>
            {savedCodes.length === 0 ? (
              <p>No saved codes yet. Save some codes from the Problems section!</p>
            ) : (
              <div className="codes-grid">
                {savedCodes.map(code => (
                  <div key={code._id} className="code-card">
                    <div className="code-header">
                      <h4>{code.title}</h4>
                      <span className="language-tag">{code.language}</span>
                    </div>
                    <div className="code-meta">
                      <small>
                        Created: {new Date(code.createdAt).toLocaleDateString()}
                      </small>
                      {code.problemId && (
                        <small>Problem: {code.problemId.title}</small>
                      )}
                    </div>
                    <div className="code-preview">
                      <pre>{code.code.substring(0, 150)}...</pre>
                    </div>
                    <div className="code-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => handleEditCode(code)}
                      >
                        Edit Code
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => handleDeleteCode(code._id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;