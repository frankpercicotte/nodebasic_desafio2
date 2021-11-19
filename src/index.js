const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

function checksExistsUserAccount(request, response, next) {
  const {username} = request.headers || ""; 

  if (!username){
    return response.status(400).json({"error": `Required in headers a username!`})
  }  

  const user = users.find(elm => elm.username === username)  
  
  if (!user){
    return response.status(404).json({"error": `Username ${username} not exist!`})
  }

  request.user = user
  return next()
}

function checksCreateTodosUserAvailability(request, response, next) {
  const {user} = request
  const pro = user.pro

  if (pro){
    return next()
  }

  const qtyTodos = user.todos.length 
  if (qtyTodos > 9) {
    return response.status(403).json({"error": `Free account max todos is 10. You have ${qtyTodos}`}) 
  }

  return next()
}

function checksTodoExists(request, response, next) {
  const {username} = request.headers || "";
  const todoId = request.params.id

  const user = users.find(elm => elm.username === username)    
  if (!user){
    return response.status(404).json({"error": `Username ${username} not exist!`})
  }

  if(!validate(todoId)){
    return response.status(400).json({"error": `Invalid id,should be uuid v4`})
  }

  const todo = user.todos.find(elm => elm.id === todoId)
  if (!todo){
    return response.status(404).json({"error": `Todo id ${todoId} not exist!`})
  }

  request.user = user
  request.todo = todo  

  return next()

}

function findUserById(request, response, next) {
  userId = request.params.id

  const checkId = users.find(elm => elm.id === userId)  
  
  if (!checkId){
    return response.status(404).json({"error": `Id ${checkId} not exist!`})
  }

  request.user = checkId
  return next()
}

app.post('/users', (request, response) => {
  const { name, username } = request.body;

  const usernameAlreadyExists = users.some((user) => user.username === username);

  if (usernameAlreadyExists) {
    return response.status(400).json({ error: 'Username already exists' });
  }

  const user = {
    id: uuidv4(),
    name,
    username,
    pro: false,
    todos: []
  };

  users.push(user);

  return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
  const { user } = request;

  return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
  const { user } = request;

  if (user.pro) {
    return response.status(400).json({ error: 'Pro plan is already activated.' });
  }

  user.pro = true;

  return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
  const { user } = request;

  return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
  const { title, deadline } = request.body;
  const { user } = request;

  const newTodo = {
    id: uuidv4(),
    title,
    deadline: new Date(deadline),
    done: false,
    created_at: new Date()
  };

  user.todos.push(newTodo);

  return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksTodoExists, (request, response) => {
  const { title, deadline } = request.body;
  const { todo } = request;

  todo.title = title;
  todo.deadline = new Date(deadline);

  return response.json(todo);
});

app.patch('/todos/:id/done', checksTodoExists, (request, response) => {
  const { todo } = request;

  todo.done = true;

  return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
  const { user, todo } = request;

  const todoIndex = user.todos.indexOf(todo);

  if (todoIndex === -1) {
    return response.status(404).json({ error: 'Todo not found' });
  }

  user.todos.splice(todoIndex, 1);

  return response.status(204).send();
});

module.exports = {
  app,
  users,
  checksExistsUserAccount,
  checksCreateTodosUserAvailability,
  checksTodoExists,
  findUserById
};