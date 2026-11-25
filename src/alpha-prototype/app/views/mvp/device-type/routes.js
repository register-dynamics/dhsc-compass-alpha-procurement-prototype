const router = require('express').Router()

router.use((req, res, next) => {
  res.locals.prototypeVersion = 'current'
  res.locals.currentPath = req.path
  res.locals.query = req.query
  next()
})

module.exports = router
