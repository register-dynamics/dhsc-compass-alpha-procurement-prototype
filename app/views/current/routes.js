const allTrusts = require('./trusts')

const Database = require('better-sqlite3')
const db = new Database('test_db_pre_beta.db', { readonly: true })

const router = require('express').Router()

// Set version for all templates in this folder
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'current'
  next()
})


// A moderate quality PNRG: https://gist.github.com/blixt/f17b47c62508be59987b?permalink_comment_id=2682175#gistcomment-2682175
const mb32=a=>(t)=>(a=a+1831565813|0,t=Math.imul(a^a>>>15,1|a),t=t+Math.imul(t^t>>>7,61|t)^t,(t^t>>>14)>>>0)/2**32;
const clamp_percent=(r,min,max)=>min+Math.round(max * r)

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

const pageSize = 25
const countQuery = db.prepare(`select COUNT(*) AS count FROM search WHERE search MATCH ?`)
const searchQuery = db.prepare(`select MAKE_ID, MODEL_ID, DEVICE_ID, MAKE, MODEL, MANUFACTURER, CATEGORY, COUNTRY from search where search match @term limit @limit offset @offset`)
router.get(/search-/, (req, res, next) => {
  const term = req.query.q?.toString()
  const page = parseInt(req.query.page || "1") - 1
  const queryParams = {term: term, limit: pageSize, offset: pageSize * page}

  const count = countQuery.raw(true).get(queryParams.term)
  const results = searchQuery.all(queryParams)
  console.log(`Found ${count} results (retrieved ${results.length}) for term ${term}`)

  res.locals.searchTerm = term

  res.locals.searchOffset = count > 0 ? (page * pageSize) + 1 : 0
  res.locals.searchPage = page + 1
  res.locals.searchMaxPages = Math.trunc(count / pageSize) + Math.min(count % pageSize, 1)
  res.locals.searchResultsCount = count
  res.locals.searchResults = results.map(function (result) {
    const random = randomEvidence(result.MODEL_ID)

    return {
      make: result.MAKE,
      make_id: result.MAKE_ID,
      model: result.MODEL,
      model_id: result.MODEL_ID,
      device_id: result.DEVICE_ID,
      manufacturer: result.MANUFACTURER,
      category: result.CATEGORY,
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

const individualQuery = db.prepare("select MAKE, MODEL, MODEL_ID, MANUFACTURER, CATEGORY, COUNTRY from search where MAKE_ID = ? and MODEL_ID = ? and DEVICE_ID = ?")
router.get(/product-page/, (req, res, next) => {
  const result = individualQuery.get(parseInt(req.query.make), parseInt(req.query.model), parseInt(req.query.device))
  const random = randomEvidence(result.MODEL_ID)

  res.locals.searchTerm = req.query.q
  res.locals.product = {
    make: result.MAKE,
    model: result.MODEL,
    model_id: result.MODEL_ID,
    manufacturer: result.MANUFACTURER,
    category: result.CATEGORY,
    country: result.COUNTRY,
    trusts: random.trusts,
    documents: random.documents,
    document_types: Array.from(new Set(random.documents)).toSorted(),
    procured: random.procured,
    under_review: random.underReview,
    excluded: random.excluded
  }
  next()
})

module.exports = router
