

const router = require('express').Router()


// Set version for all templates in this folder
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'v3'
  next()
})

// Define your v3 routes here (no nested require)
router.get('/dashboard', (req, res) => {
  res.render('v3/dashboard')
})

// Add other routes as needed...



module.exports = router