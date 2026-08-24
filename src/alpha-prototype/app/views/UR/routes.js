const allTrusts = require('./trusts')

const Database = require('better-sqlite3')
const db = new Database('G:/Compass/test.db', { readonly: true }) //Replace database path with correct local directory

const router = require('express').Router()

// Set version for all templates in this folder
router.use((req, res, next) => {
  res.locals.prototypeVersion = 'UR'
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
const searchQuery = db.prepare(`select PRODUCT_ID, DEVICE_ID, PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY from search where search match @term limit @limit offset @offset`)
const searchWithCategoriesQuery = db.prepare(`select PRODUCT_ID, DEVICE_ID, PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY from search where search match @term and GMDN_NAME in (select value from json_each(@categories)) limit @limit offset @offset`)
const categoryQuery = db.prepare(`select GMDN_NAME AS name, COUNT(*) AS count from search where search match ? group by GMDN_NAME order by count DESC`)

// Escape double quotes in the search term for FTS5 queries
function formatFtsTerm(term) {
  return `"${term.replaceAll('"', '""')}"`
}

router.get(/search-/, (req, res, next) => {
  const term = req.query.q?.toString()
  const page = parseInt(req.query.page || "1") - 1
  const queryCategories = [(req.query.category || [])].flat().filter(c => c !== "_unchecked")
  console.log(queryCategories)
  const searchTerm = formatFtsTerm(term)
  const queryParams = {term: searchTerm, limit: pageSize, offset: pageSize * page, categories: JSON.stringify(queryCategories)}

  // Populate category query string for pagination if required
  if (queryCategories.length > 0) {
    const categoryQueryString = `&${queryCategories.map(c => `category=${encodeURIComponent(c)}`).join('&')}`
    res.locals.categoriesQueryString = categoryQueryString
  }

  const query = queryCategories.length > 0 ? searchWithCategoriesQuery : searchQuery
  const count = countQuery.raw(true).get(searchTerm)
  const results = query.all(queryParams)
  console.log(`Found ${count} results (retrieved ${results.length}) for term ${term}`)

  const categories = categoryQuery.all(searchTerm)
  categories.forEach(c => c.selected = queryCategories.includes(c.name))

  res.locals.searchTerm = term

  res.locals.searchOffset = count > 0 ? (page * pageSize) + 1 : 0
  res.locals.searchPage = page + 1
  res.locals.searchMaxPages = Math.trunc(count / pageSize) + Math.min(count % pageSize, 1)
  res.locals.searchResultsCount = count
  res.locals.searchResultCategories = categories
  res.locals.searchResults = results.map(function (result) {
    const random = randomEvidence(result.MODEL_ID)

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

const individualQuery = db.prepare("select PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY from search where PRODUCT_ID = ?")

const documentsQuery = db.prepare("SELECT document_id, organisation_name, type_of_doc_desc, rating, procured, scale, ward_department, assessment_date, expiry_date, org_category_desc, org_type_desc, url_directory FROM make_documents WHERE product_id = ?")

const contactsQuery = db.prepare(`SELECT
  dc.document_id,
  dc.discuss_implementation,
  dc.discuss_training,
  dc.discuss_outcomes,
  dc.discuss_pharmacy_integration,
  dc.discuss_business_case,
  dc.discuss_real_world_use,
  dc.discuss_EHR_integration,
  c.contact_id,
  c.title,
  c.given_name,
  c.surname,
  c.email,
  c.phone_no,
  c.role
FROM document_contacts dc
JOIN contacts c
  ON c.contact_id = dc.contact_id
WHERE dc.document_id IN (SELECT value FROM json_each(@documentIds));`)

router.get(/product-page/, (req, res, next) => {

  console.log("GET product-page for make_id", req.query.make)

  const result = individualQuery.get(parseInt(req.query.make))
  const random = randomEvidence(result.MODEL_ID)

  const documents = documentsQuery.all(parseInt(req.query.make))

  const documentIds = documents.map(d => d.document_id)

  console.log("Document IDs for make_id", req.query.make, ":", documentIds)

  const contacts = contactsQuery.all({ documentIds: JSON.stringify(documentIds) })

  console.log("Found", documents.length, "documents and", contacts.length, "contacts for make_id", req.query.make)

  for (const document of documents) {
    document.contacts = contacts.filter(c => {
      return c.document_id === document.document_id
    })

    console.log("Document", document.document_id, "has", document.contacts.length, "contacts")
  }

  res.locals.searchTerm = req.query.q
  res.locals.product = {
    make: result.PRODUCT_NAME,
    model: result.MODEL,
    manufacturer: result.MANUFACTURER,
    category: result.GMDN_NAME,
    type: result.TYPE,
    country: result.COUNTRY,
    trusts: random.trusts,
    documents: documents,
    document_types: Array.from(new Set(random.documents)).toSorted(),
    procured: random.procured,
    under_review: random.underReview,
    excluded: random.excluded
  }
  next()
})

const individualODEP = db.prepare("select product_id, rating, rating_type, assessment_date, expiry_date, summary, organisation_name, type_of_doc_desc, org_category_desc, org_type_desc, url_directory from make_documents where product_id = ? and organisation_name = ?")
router.get(/product-page/, (req, res, next) => {

  const results = individualODEP.all(parseInt(req.query.make), "ODEP")
  if (results) {
    console.log("There is an ODEP assessment")
    res.locals.ODEPs = results.map(function (result) {
    return {
      name: result.organisation_name,
      document_type: result.type_of_doc_desc,
      rating: result.rating,
      rating_type: result.rating_type,
      start_date: result.assessment_date,
      end_date: result.expiry_date,
      organisation_type: result.org_type_desc,
      organisation_category: result.org_category_desc,
      url: result.url_directory
    }
  })
  }
  next()
})

const individualNJR = db.prepare("select product_id, rating, rating_type, assessment_date, expiry_date, summary, organisation_name, type_of_doc_desc, org_category_desc, org_type_desc, url_directory from make_documents where product_id = ? and organisation_name = ?")
router.get(/product-page/, (req, res, next) => {
  const results = individualNJR.all(parseInt(req.query.make), "NJR")
  if (results) {
    console.log("There is an NJR report")
    res.locals.NJRs = results.map(function (result) {
    return {
      name: result.organisation_name,
      document_type: result.type_of_doc_desc,
      rating: result.rating,
      rating_type: result.rating_type,
      start_date: result.assessment_date,
      end_date: result.expiry_date,
      organisation_type: result.org_type_desc,
      organisation_category: result.org_category_desc,
      summary: "This a placeholder summary for NJR reports",
      url: result.url
    }
  })
  }
  console.log(res.locals.NJRs)
  next()
})

module.exports = router
