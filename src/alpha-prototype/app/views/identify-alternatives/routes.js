const allTrusts = require('../current/trusts')

const Database = require('better-sqlite3')
const db = new Database('database.db', { readonly: true })

const router = require('express').Router()

// Use the current/ layouts and partials, since this concept builds on the
// current journey rather than on the UR copy.
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'current'
  // For marking the current page in the header navigation (_layout.html)
  res.locals.currentPath = req.path
  next()
})

// A moderate quality PNRG: https://gist.github.com/blixt/f17b47c62508be59987b?permalink_comment_id=2682175#gistcomment-2682175
const mb32=a=>(t)=>(a=a+1831565813|0,t=Math.imul(a^a>>>15,1|a),t=t+Math.imul(t^t>>>7,61|t)^t,(t^t>>>14)>>>0)/2**32;
const clamp_percent=(r,min,max)=>min+Math.round(max * r)

// Same generator the current/ and UR/ search routes use, so a device shows the
// same invented evidence here as it does there.
//
// Note: those routes seed it with result.MODEL_ID, which their query does not
// select, so every row gets the same seed and the same numbers. Seeded with
// DEVICE_ID here so the 20 devices differ from each other, which is the point
// of a page for comparing them.
function randomEvidence(model_id) {
  const rand = mb32(model_id)

  const numTrusts = clamp_percent(rand(), 0, 24)
  const procured = new Set()
  while (procured.size < numTrusts) {
    procured.add(allTrusts[clamp_percent(rand(), 0, allTrusts.length-1)])
  }

  const numExcluded = clamp_percent(rand(), 0, Math.min(procured.size, 4))
  const excluded = new Set()
  while (excluded.size < numExcluded) {
    let elem = Array.from(procured.keys())[clamp_percent(rand(), 0, procured.size-1)]
    procured.delete(elem)
    excluded.add(elem)
  }

  const numUnderReview = clamp_percent(rand(), 0, Math.min(procured.size, 6))
  const underReview = new Set()
  while (underReview.size < numUnderReview) {
    let elem = Array.from(procured.keys())[clamp_percent(rand(), 0, procured.size-1)]
    procured.delete(elem)
    underReview.add(elem)
  }

  const documentTypes = ["Product trials", "Business cases", "Case studies"]
  const numDocuments = clamp_percent(rand(), 0, Math.min(numTrusts * 3, 9))
  const documents = new Array()
  while (documents.length < numDocuments) {
    documents.push(documentTypes[(clamp_percent(rand(), 0, documentTypes.length - 1))])
  }

  return {
    trusts: new Set(procured).union(underReview).union(excluded),
    procured: procured,
    underReview: underReview,
    excluded: excluded,
    documents: documents,
  }
}

// The catalogue is 20 devices, so everything fits on one page and there is no
// paging. With no search term and no categories ticked the page shows all 20.
const FIELDS = `PRODUCT_ID, DEVICE_ID, PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY`
const ORDER = `order by GMDN_NAME, MANUFACTURER, PRODUCT_NAME`

const allQuery = db.prepare(`select ${FIELDS} from search ${ORDER}`)
const termQuery = db.prepare(`select ${FIELDS} from search where search match @term ${ORDER}`)
const catQuery = db.prepare(`select ${FIELDS} from search
  where GMDN_NAME in (select value from json_each(@categories)) ${ORDER}`)
const termCatQuery = db.prepare(`select ${FIELDS} from search
  where search match @term
  and GMDN_NAME in (select value from json_each(@categories)) ${ORDER}`)

// Category counts are computed against the search term but NOT against the
// ticked categories, so the sidebar keeps showing what else could be picked
// rather than collapsing to the current selection.
const allCategoriesQuery = db.prepare(`select GMDN_NAME as name, COUNT(*) as count
  from search group by GMDN_NAME order by count DESC, name ASC`)
const termCategoriesQuery = db.prepare(`select GMDN_NAME as name, COUNT(*) as count
  from search where search match @term group by GMDN_NAME order by count DESC, name ASC`)

const totalQuery = db.prepare(`select COUNT(*) as count from search`)

// Escape double quotes for FTS5, as current/routes.js does.
function formatFtsTerm(term) {
  return `"${term.replaceAll('"', '""')}"`
}

// A checkbox group submits a string for one box and an array for several.
function asArray(value) {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

router.get('/all-devices', (req, res, next) => {
  const term = (req.query.q || '').trim()
  const categories = asArray(req.query.category).filter(Boolean)

  const params = {
    term: formatFtsTerm(term),
    categories: JSON.stringify(categories)
  }

  let results = []
  try {
    if (term && categories.length) results = termCatQuery.all(params)
    else if (term) results = termQuery.all(params)
    else if (categories.length) results = catQuery.all(params)
    else results = allQuery.all()
  } catch (err) {
    // An FTS syntax error means the term matched nothing usable. Treat it as
    // no results rather than a 500, so the empty state does the explaining.
    results = []
  }

  const available = term ? termCategoriesQuery.all(params) : allCategoriesQuery.all()

  res.locals.searchTerm = term
  res.locals.catalogueTotal = totalQuery.get().count
  res.locals.filtersActive = Boolean(term) || categories.length > 0
  res.locals.selectedCategories = categories
  res.locals.searchResultCategories = available.map(c => ({
    name: c.name,
    count: c.count,
    selected: categories.includes(c.name)
  }))
  // One page: the catalogue is small enough that everything fits. Set anyway so
  // the pagination block from current/search-results.html renders as it does
  // there rather than erroring on undefined.
  res.locals.searchPage = 1
  res.locals.searchMaxPages = 1
  res.locals.searchOffset = results.length > 0 ? 1 : 0
  res.locals.categoriesQueryString = categories.map(c => `&category=${encodeURIComponent(c)}`).join('')
  res.locals.searchResultsCount = results.length
  res.locals.searchResults = results.map(function (result) {
    const random = randomEvidence(result.DEVICE_ID)

    return {
      make: result.PRODUCT_NAME,
      make_id: result.PRODUCT_ID,
      model: result.MODEL,
      device_id: result.DEVICE_ID,
      manufacturer: result.MANUFACTURER,
      category: result.GMDN_NAME,
      type: result.TYPE,
      country: result.COUNTRY,
      trusts: random.trusts.size,
      documents: random.documents.length,
      document_types: Array.from(new Set(random.documents)).toSorted(),
      procured: random.procured.size,
      under_review: random.underReview.size,
      excluded: random.excluded.size
    }
  })

  next()
})

// GMDN categories. Empty for now, so the page has a route to render through.
router.get('/gmdn-categories', (req, res, next) => {
  next()
})

// Search and browse, and the Device function categories it leads to. Both are
// mockups with nothing wired, so they only need a route to render through.
router.get('/search-and-browse', (req, res, next) => {
  next()
})

router.get('/search-results', (req, res, next) => {
  next()
})

// Search2: a second version of search, linked from the header.
router.get('/search2', (req, res, next) => {
  next()
})

// A supplier page mockup, linked from the header.
router.get('/supplier-nuvasive', (req, res, next) => {
  next()
})

// A device results page mockup, linked from the header.
router.get('/device-results', (req, res, next) => {
  next()
})

// The header's Search link in current/layouts/layout-signed-in.html is the
// relative href "search", so on these pages it lands here. Sent to the mock
// search results for easy navigation round the sketch, without touching the
// dev-owned layout.
router.get('/search', (req, res) => {
  res.redirect('/identify-alternatives/search-results')
})

router.get('/device-function', (req, res, next) => {
  next()
})

router.get('/tissue-reparation-devices', (req, res, next) => {
  next()
})

router.get('/bone-joint-fixation-implants', (req, res, next) => {
  next()
})

router.get('/internal-spinal-fixation-systems', (req, res, next) => {
  next()
})

router.get('/bone-screw-internal-spinal-fixation-system-non-sterile', (req, res, next) => {
  next()
})

router.get('/nuvasive-bone-screw-internal-spinal-fixation-system', (req, res, next) => {
  next()
})

router.get('/mas-plif', (req, res, next) => {
  next()
})

module.exports = router
