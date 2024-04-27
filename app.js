const express = require('express')
const app = express()
app.use(express.json())

const format = require('date-fns/format')
const isMatch = require('date-fns/isMatch')
const isValid = require('date-fns/isValid')

const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const path = require('path')

const dbPath = path.join(__dirname, 'todoApplication.db')

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server is Running at http://localhost:3000/')
    })
  } catch (error) {
    console.log(`DB Error : ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

//Todos API :

const hasStatusProperty = requestQuery => {
  return requestQuery.status !== undefined
}

const hasPriorityProperty = requestQuery => {
  return requestQuery.priority !== undefined
}

const hasPriorityAndStatusProperty = requestQuery => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  )
}

const hasSearchProperty = requestQuery => {
  return requestQuery.search_q !== undefined
}

const hasCategoryAndStatusProperty = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  )
}

const hasCategoryProperty = requestQuery => {
  return requestQuery.category !== undefined
}

const hasCategoryAndPriorityProperty = requestQuery => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  )
}

const convertDbObjectToResponseObject = dbObject => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  }
}

//GET Todos API:

app.get('/todos/', async (request, response) => {
  let data = null
  let getTodosQuery = ''
  const {search_q = '', category, status, priority} = request.query

  switch (true) {
    //Scenario 1:

    case hasStatusProperty(request.query):
      if (status === 'TO DO') {
        getTodosQuery = `
            SELECT * FROM todo WHERE status = '${status}'`
        data = await db.all(getTodosQuery)
        response.send(
          data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
        )
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break

    //Scenario 2:

    case hasPriorityProperty(request.query):
      if (priority === 'HIGH') {
        getTodosQuery = `
        SELECT * FROM todo WHERE priority = '${priority}';`
        data = await db.all(getTodosQuery)
        response.send(
          data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
        )
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    //Scenario 3 :

     case hasPriorityAndStatusProperty(request.query):
      if (priority === "HIGH" || priority === "MEDIUM" || priority === "LOW") {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodosQuery = `
                SELECT *
                    FROM todo  
                WHERE
                 status = '${status}' AND priority = '${priority}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }

      break;


    //Scenario 4:

    case hasSearchProperty(request.query):
      getTodosQuery = `
        SELECT * FROM todo WHERE todo LIKE '%${search_q}%'`
      data = await db.all(getTodosQuery)
      response.send(
        data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
      )
      break

    //Scenario 5:

    case hasCategoryAndStatusProperty(request.query):
      if (
        category === "WORK" ||
        category === "HOME" ||
        category === "LEARNING"
      ) {
        if (
          status === "TO DO" ||
          status === "IN PROGRESS" ||
          status === "DONE"
        ) {
          getTodosQuery = `
                SELECT *
                        FROM todo
                    WHERE 
                        category='${category}' and status='${status}';`;
          data = await db.all(getTodosQuery);
          response.send(data.map((eachTodo) => convertDbObjectToResponseObject(eachTodo)));
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
        }
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }

      break;

    //Scenario 6:

    case hasCategoryProperty(request.query):
      if (category === 'HOME') {
        getTodosQuery = `
          SELECT * FROM todo WHERE category = '${category}';`
        data = await db.all(getTodosQuery)
        response.send(
          data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
        )
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    //Scenario 7:

    case hasCategoryAndPriorityProperty(request.query):
      if (category === 'LEARNING') {
        if (priority === 'HIGH') {
          getTodosQuery = `
            SELECT * FROM todo WHERE priority = '${priority}' AND category = '${category}'`
          data = await db.all(getTodosQuery)
          response.send(
            data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
          )
        } else {
          response.status(400)
          response.send('Invalid Todo Priority')
        }
      } else {
        response.status(400)
        response.category('Invalid Todo Category')
      }
      break
    default:
      getTodosQuery = `
          SELECT * FROM todo`
      data = await db.all(getTodosQuery)
      response.send(
        data.map(eachTodo => convertDbObjectToResponseObject(eachTodo)),
      )
  }
})

//GET Todo API:

app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  getTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId}`
  const dbResponse = await db.get(getTodoQuery)
  response.send(convertDbObjectToResponseObject(dbResponse))
})

//GET Duedate API:

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isMatch(date, "yyyy-MM-dd")) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    const dateQuery = `
        SELECT *
            FROM todo
        WHERE due_date='${newDate}';`;
    const dateResponse = await db.all(dateQuery);
    response.send(dateResponse.map((eachTodo) => convertDbObjectToResponseObject(eachTodo)));
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//POST Todo API:

app.post('/todos/', async (request, response) => {
  const {id, todo, priority, status, category, dueDate} = request.body
  if (priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH') {
    if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
      if (
        category === 'HOME' ||
        category === 'LEARNING' ||
        category === 'WORK'
      ) {
        if (isMatch(dueDate, 'yyyy-MM-dd')) {
          const postDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
          const postTodoQuery = `
            INSERT INTO todo(id, todo, priority, status, category, due_date)
            VALUES(${id}, '${todo}', '${priority}', '${status}', '${category}', '${postDueDate}')`
          await db.run(postTodoQuery)
          response.send('Todo Successfully Added')
        } else {
          response.status(400)
          response.send('Invalid Due Date')
        }
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
    } else {
      response.status(400)
      response.send('Invalid Todo Status')
    }
  } else {
    response.status(400)
    response.send('Invalid Todo Priority')
  }
})

//PUT Todos API:

app.put('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  let updateColumn = ''
  const requestBody = request.body
  const previousTodoQuery = `
    SELECT * FROM todo WHERE id = ${todoId}`
  const previousTodo = await db.get(previousTodoQuery)
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body

  let updateTodoQuery = ''

  switch (true) {
    //Scenario 1:
    case requestBody.status != undefined:
      if (status === 'TO DO' || status === 'IN PROGRESS' || status === 'DONE') {
        updateTodoQuery = `
          UPDATE todo SET todo = '${todo}', status = '${status}', priority = '${priority}', category = '${category}',
          due_date = '${dueDate}' WHERE id = ${todoId};`
        await db.run(updateTodoQuery)
        response.send('Status Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Status')
      }
      break

    //Scenario 2:
    case requestBody.priority != undefined:
      if (priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH') {
        updateTodoQuery = `
          UPDATE todo SET todo = '${todo}', status = '${status}', priority = '${priority}', category = '${category}',
          due_date = '${dueDate}' WHERE id = ${todoId};`
        await db.run(updateTodoQuery)
        response.send('Priority Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Priority')
      }
      break

    //Scenario 3:
    case requestBody.todo != undefined:
      updateTodoQuery = `
          UPDATE todo SET todo = '${todo}', status = '${status}', priority = '${priority}', category = '${category}',
          due_date = '${dueDate}' WHERE id = ${todoId};`
      await db.run(updateTodoQuery)
      response.send('Todo Updated')
      break

    //Scenario 4:

    case requestBody.category != undefined:
      if (
        category === 'HOME' ||
        category === 'LEARNING' ||
        category === 'WORK'
      ) {
        updateTodoQuery = `
          UPDATE todo SET todo = '${todo}', status = '${status}', priority = '${priority}', category = '${category}',
          due_date = '${dueDate}' WHERE id = ${todoId};`
        await db.run(updateTodoQuery)
        response.send('Category Updated')
      } else {
        response.status(400)
        response.send('Invalid Todo Category')
      }
      break

    //Scenario 5:
    case requestBody.dueDate != undefined:
      if (isMatch(dueDate, 'yyyy-MM-dd')) {
        const newDueDate = format(new Date(dueDate), 'yyyy-MM-dd')
        updateTodoQuery = `
          UPDATE todo SET todo = '${todo}', status = '${status}', priority = '${priority}', category = '${category}',
          due_date = '${newDueDate}' WHERE id = ${todoId};`
        await db.run(updateTodoQuery)
        response.send('Due Date Updated')
      } else {
        response.status(400)
        response.send('Invalid Due Date')
      }
      break
  }
})

//DELETE Todo API:

app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params
  const deleteTodoQuery = `
    DELETE FROM todo WHERE id = ${todoId};`
  await db.run(deleteTodoQuery)
  response.send('Todo Deleted')
})

module.exports = app
