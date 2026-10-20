const router = require('express').Router()

// Use the current/ layouts and partials, since this concept builds on the
// current journey rather than on the UR copy.
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'current'
  // For marking the current page in the header navigation (_layout.html)
  res.locals.currentPath = req.path
  next()
})

// The signed-in user's trust colleagues, as their accounts would give them.
// Invented. The user is first, the rest A to Z.
const trustPeople = [
  { value: 'kelvin-simpson', name: 'Kelvin Simpson', jobTitle: 'Regional Manager', you: true },
  { value: 'aisha-rahman', name: 'Aisha Rahman', jobTitle: 'Theatre manager, ophthalmology' },
  { value: 'ben-okafor', name: 'Ben Okafor', jobTitle: 'Procurement category lead' },
  { value: 'hannah-whitlock', name: 'Hannah Whitlock', jobTitle: 'Consultant ophthalmic surgeon' },
  { value: 'marcus-lee', name: 'Marcus Lee', jobTitle: 'Sterile services manager' }
]

router.use((req, res, next) => {
  res.locals.trustPeople = trustPeople
  next()
})

// Branching, per Prototype-Kit/guides/branching.md. Answers are stored by
// the kit's autoStoreData before these run.

router.post('/who-should-be-a-contact', (req, res) => {
  const data = req.session.data
  const answer = data.whoShouldBeAContact

  if (answer === 'me' || answer === 'everyone') {
    // Only "choose" can include people not on the list
    data.otherContacts = []
    res.redirect('/add-contact-details/check-contacts')
  } else if (answer === 'choose') {
    res.redirect('/add-contact-details/choose-contacts')
  } else {
    res.redirect('/add-contact-details/who-should-be-a-contact')
  }
})

router.post('/choose-contacts', (req, res) => {
  const data = req.session.data
  const contacts = data.contacts || []
  data.otherContacts = data.otherContacts || []

  if (contacts.includes('not-listed')) {
    // Ask for someone only if nobody has been added yet, so coming back
    // through this page from check answers does not ask again
    if (data.otherContacts.length === 0) {
      res.redirect('/add-contact-details/add-someone-not-listed')
    } else {
      res.redirect('/add-contact-details/check-contacts')
    }
  } else if (contacts.length > 0) {
    data.otherContacts = []
    res.redirect('/add-contact-details/check-contacts')
  } else {
    res.redirect('/add-contact-details/choose-contacts')
  }
})

// ?edit=<index> changes someone already added, otherwise adds a new person
router.post('/add-someone-not-listed', (req, res) => {
  const data = req.session.data
  data.otherContacts = data.otherContacts || []

  const person = {
    name: data.otherContactName,
    jobTitle: data.otherContactJobTitle,
    email: data.otherContactEmail
  }
  delete data.otherContactName
  delete data.otherContactJobTitle
  delete data.otherContactEmail

  const edit = parseInt(req.query.edit, 10)
  if (Number.isInteger(edit) && data.otherContacts[edit]) {
    data.otherContacts[edit] = person
  } else {
    data.otherContacts.push(person)
  }

  res.redirect('/add-contact-details/check-contacts')
})

router.get('/add-someone-not-listed', (req, res, next) => {
  const edit = parseInt(req.query.edit, 10)
  const others = req.session.data.otherContacts || []
  if (Number.isInteger(edit) && others[edit]) {
    res.locals.editIndex = edit
    res.locals.person = others[edit]
  }
  next()
})

// Works out who will be added from the answers given
router.get('/check-contacts', (req, res, next) => {
  const data = req.session.data
  const answer = data.whoShouldBeAContact
  let people = []

  if (answer === 'me') {
    people = trustPeople.filter(p => p.you)
  } else if (answer === 'everyone') {
    people = trustPeople
  } else if (answer === 'choose') {
    const contacts = data.contacts || []
    people = trustPeople.filter(p => contacts.includes(p.value))
  }

  res.locals.peopleFromTrust = people
  res.locals.otherContacts = data.otherContacts || []
  next()
})

router.post('/check-contacts', (req, res) => {
  res.redirect('/add-contact-details/contacts-added')
})

module.exports = router
