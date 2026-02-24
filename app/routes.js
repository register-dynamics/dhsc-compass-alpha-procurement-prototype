// External dependencies
const express = require('express')

const router = express.Router()

// Add your routes here - above the module.exports line

// Use middleware instead of router.get('*', ...) to avoid path-to-regexp errors
router.use(function (req, res, next) {
  // These functions are available on all pages in the prototype.
  // To use call the function inside curly brackets, for example {{ example_function() }}

  // Examples of date
  //
  // {{ date() }} shows todays date in the format 5 May 2022
  // {{ date({day: 'numeric', month: 'numeric', year: 'numeric'}) }} shows todays date in the format 05/05/2022
  // {{ date({day: 'numeric'}) }} shows the just the date of date, 5
  // {{ date({day: '2-digit'}) }} shows the date with a leading zero, 05
  // {{ date({day: 'numeric'}, {'day': -1}) }} shows just the date of yesterday
  // {{ date({weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'}) }} shows todays date in the format Tuesday, 5 July 2022.
  // {{ date({day: 'numeric', month: 'numeric', year: 'numeric'}, {'day': +2}) }}

  
  res.locals.date = function (
    format = { day: 'numeric', month: 'long', year: 'numeric' },
    diff = { year: 0, month: 0, day: 0 },
    
  ) {
    var date = new Date()
    if ('day' in diff) {
      date.setDate(date.getDate() + diff.day)
    }
    if ('month' in diff) {
      date.setMonth(date.getMonth() + diff.month)
    }
    if ('year' in diff) {
      date.setYear(date.getFullYear() + diff.year)
    }
    const formattedDate = new Intl.DateTimeFormat('en-GB', format).format(date)
    return `${formattedDate}`
  }

  // Examples of today
  //
  // Useful for pre-populating date fields
  //
  // {{ today().day }} shows just todays day
  // {{ today().month }} shows just todays month as a number
  // {{ today().year }} shows just todays year as a number
  res.locals.today = () => ({
    day: res.locals.date({ day: 'numeric' }),
    month: res.locals.date({ month: 'numeric' }),
    year: res.locals.date({ year: 'numeric' }),
  })

  // Examples of yesterday
  //
  // Useful for pre-populating date fields
  //
  // {{ yesterday().day }} shows just todays day
  // {{ yesterday().month }} shows just todays month as a number
  // {{ yesterday().year }} shows just todays year as a number
  res.locals.yesterday = () => ({
    day: res.locals.date({ day: 'numeric' }, (diff = { day: -1 })),
    month: res.locals.date({ month: 'numeric' }, (diff = { day: -1 })),
    year: res.locals.date({ year: 'numeric' }, (diff = { day: -1 })),
  })

  next()
})

// const radioButtonRedirect = require('radio-button-redirect')
// router.use(radioButtonRedirect)

// Add your routes here
// Search routes

// STANDARD BRANCHING  
router.post('/country-answer', function(request, response) {

  var country = request.session.data['country']
  if (country == "England"){
      response.redirect("/age")
  } else {
      response.redirect("/ineligible-country")
  }
})

// MULTI QUESTION REDIRECT
router.post('/redirect-test', function(request, response) {

  var hso = request.session.data['hso'];//
  var hld = request.session.data['hld'];//
  var hwp = request.session.data['hwp'];//

  if (hso === "yes" && hld === "yes" && hwp === "yes"){
    response.redirect("current/all-yes") // Initial redirect

  }
  else if (hso === "no" && hld === "no" && hwp === "no"){
    response.redirect("current/all-no") // Initial redirect

  }

  else if (hso === "yes" && hld === "no" && hwp === "yes"){
    response.redirect("current/all-yes") // Initial redirect

  }
  
})
// Version-specific routes
router.use('/current', require('./views/current/routes'))
// v1 routes
router.use('/v1', require('./views/v1/routes'))
// v2 routes
router.use('/v2', require('./views/v2/routes'))
// v3 routes
router.use('/v3', require('./views/v3/routes'))



module.exports = router
