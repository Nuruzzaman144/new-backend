const express = require('express')
require('dotenv').config()

const app = express()
const port = 3000

const user = {
    id: 1,
    name: "Nuruzzaman",
    email: "nuruzzaman@example.com",
    age: 22,
    skills: ["javascript", "nodejs", "express"],
    active: true
  };

app.get('/', (req, res) => {
  res.send('Hello World!')
})
app.get('/twitter',(req,res)=>{
    res.send("Nuruzzaman")
})
app.get('/login',(req,res)=>{
    res.send('<h1>Please login at Nuruzz portfolio</h1>')
})
app.get('/nuru',(req,res)=>{
    res.json(user);
})
app.listen(process.env.PORT, () => {
  console.log(`Example app listening on port ${port}`)
})
