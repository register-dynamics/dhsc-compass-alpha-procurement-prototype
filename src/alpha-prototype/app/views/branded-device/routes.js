const router = require('express').Router()

// Use the current/ layouts and partials, as add-contact-details does.
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'current'
  // For marking the current page in the header navigation (_layout.html)
  res.locals.currentPath = req.path
  next()
})

module.exports = router
