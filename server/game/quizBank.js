/**
 * quizBank.js — Quick coding quiz questions for the Quiz Bomb sabotage.
 * Each has: question, 4 options, correctIndex (0-3).
 */

const quizzes = [
  // ── Python ──────────────────────────────────────────────
  {
    question: "What does  arr[-1]  return in Python?",
    options: ["The first element", "The last element", "An error", "-1"],
    correctIndex: 1,
  },
  {
    question: "What is the output of  bool([])  in Python?",
    options: ["True", "False", "None", "Error"],
    correctIndex: 1,
  },
  {
    question: "Which keyword is used to handle exceptions in Python?",
    options: ["catch", "except", "handle", "rescue"],
    correctIndex: 1,
  },
  {
    question: "What does  len('hello')  return?",
    options: ["4", "5", "6", "Error"],
    correctIndex: 1,
  },
  {
    question: "What is  3 // 2  in Python?",
    options: ["1.5", "1", "2", "Error"],
    correctIndex: 1,
  },
  {
    question: "What data type is  {'a': 1}  in Python?",
    options: ["list", "set", "dict", "tuple"],
    correctIndex: 2,
  },
  {
    question: "Which of these is immutable in Python?",
    options: ["list", "dict", "set", "tuple"],
    correctIndex: 3,
  },
  {
    question: "What does  'hello'.upper()  return?",
    options: ["'Hello'", "'HELLO'", "'hello'", "Error"],
    correctIndex: 1,
  },
  {
    question: "What is  type(None)  in Python?",
    options: ["<class 'bool'>", "<class 'NoneType'>", "<class 'None'>", "<class 'null'>"],
    correctIndex: 1,
  },
  {
    question: "What does  range(3)  produce?",
    options: ["[1, 2, 3]", "[0, 1, 2]", "[0, 1, 2, 3]", "[1, 2]"],
    correctIndex: 1,
  },

  // ── JavaScript ──────────────────────────────────────────
  {
    question: "What is  typeof null  in JavaScript?",
    options: ["'null'", "'undefined'", "'object'", "'boolean'"],
    correctIndex: 2,
  },
  {
    question: "What does  '5' + 3  evaluate to in JS?",
    options: ["8", "'53'", "NaN", "Error"],
    correctIndex: 1,
  },
  {
    question: "Which array method removes the last element?",
    options: [".shift()", ".pop()", ".splice()", ".slice()"],
    correctIndex: 1,
  },
  {
    question: "What is  [] == false  in JavaScript?",
    options: ["true", "false", "TypeError", "undefined"],
    correctIndex: 0,
  },
  {
    question: "What does  NaN === NaN  return?",
    options: ["true", "false", "Error", "undefined"],
    correctIndex: 1,
  },
  {
    question: "Which keyword declares a block-scoped variable?",
    options: ["var", "let", "global", "def"],
    correctIndex: 1,
  },
  {
    question: "What does  Array.isArray({})  return?",
    options: ["true", "false", "undefined", "Error"],
    correctIndex: 1,
  },
  {
    question: "What HTTP status code means 'Not Found'?",
    options: ["401", "403", "404", "500"],
    correctIndex: 2,
  },

  // ── General CS ──────────────────────────────────────────
  {
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
    correctIndex: 1,
  },
  {
    question: "Which data structure uses FIFO ordering?",
    options: ["Stack", "Queue", "Tree", "Graph"],
    correctIndex: 1,
  },
  {
    question: "What does SQL  SELECT  do?",
    options: ["Deletes rows", "Updates rows", "Retrieves rows", "Creates a table"],
    correctIndex: 2,
  },
  {
    question: "What does REST stand for?",
    options: [
      "Remote Execution Server Transfer",
      "Representational State Transfer",
      "Reliable Secure Transport",
      "Resource Endpoint Service Technology",
    ],
    correctIndex: 1,
  },
  {
    question: "Which HTTP method is used to update a resource?",
    options: ["GET", "POST", "PUT", "DELETE"],
    correctIndex: 2,
  },
  {
    question: "What is a deadlock?",
    options: [
      "A fast algorithm",
      "Two processes waiting for each other forever",
      "A type of sort",
      "A network error",
    ],
    correctIndex: 1,
  },
  {
    question: "What is the worst-case time complexity of quicksort?",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correctIndex: 2,
  },
  {
    question: "What does  git merge  do?",
    options: [
      "Deletes a branch",
      "Combines two branches",
      "Creates a new repository",
      "Reverts a commit",
    ],
    correctIndex: 1,
  },
  {
    question: "What is a hash table's average lookup time?",
    options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
    correctIndex: 2,
  },
  {
    question: "What does DNS resolve?",
    options: [
      "IP to MAC address",
      "Domain name to IP address",
      "Port to protocol",
      "URL to file path",
    ],
    correctIndex: 1,
  },
  {
    question: "Which protocol is stateless?",
    options: ["FTP", "SSH", "HTTP", "SMTP"],
    correctIndex: 2,
  },
  {
    question: "What is the base case in recursion?",
    options: [
      "The fastest case",
      "The condition that stops recursion",
      "The first call",
      "The return type",
    ],
    correctIndex: 1,
  },
  {
    question: "What is an API?",
    options: [
      "A programming language",
      "An interface for software communication",
      "A database type",
      "A testing framework",
    ],
    correctIndex: 1,
  },
];

/**
 * Returns a random quiz that hasn't been used recently in this room.
 * @param {string[]} usedIds — indices already used
 */
function getRandomQuiz(usedIds = []) {
  const available = quizzes
    .map((q, i) => ({ ...q, id: i }))
    .filter((q) => !usedIds.includes(q.id));
  if (available.length === 0) {
    // All used — just pick any
    const idx = Math.floor(Math.random() * quizzes.length);
    return { ...quizzes[idx], id: idx };
  }
  return available[Math.floor(Math.random() * available.length)];
}

module.exports = { quizzes, getRandomQuiz };
