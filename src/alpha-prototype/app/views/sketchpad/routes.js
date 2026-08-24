// Sketchpad search.
//
// Mirrors the search route in views/current/routes.js: same database, opened
// read-only, same FTS query, same page size. current/ is not touched and cannot
// be affected by anything here.
//
// The database holds the device catalogue - make, model, manufacturer, category,
// type, country. It does not hold the answers to the upload questions, so every
// filter below the category filter is generated from the device's PRODUCT_ID using
// the same trick current/routes.js already uses for procurement data. A device
// always gets the same answers, so filtering is repeatable between sessions.

const Database = require('better-sqlite3')
const db = new Database('G:/Compass/test.db', { readonly: true })

const router = require('express').Router()

// The same pseudo-random number generator current/routes.js uses, so a device's
// generated answers are stable across restarts.
// https://gist.github.com/blixt/f17b47c62508be59987b
const mb32 = a => t => (a = a + 1831565813 | 0, t = Math.imul(a ^ a >>> 15, 1 | a), t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t, (t ^ t >>> 14) >>> 0) / 2 ** 32

// Every filter group on the page. Order here is the order they appear.
// `source` says which upload flow the question came from, so the page can label
// the groups without repeating the list.
const FILTERS = [
  {
    name: 'document', legend: 'Document type', source: 'both',
    options: [
      { value: 'evaluation', text: 'Evaluation' },
      { value: 'business-case', text: 'Business case' }
    ]
  },
  {
    name: 'outcome', legend: 'Outcome', source: 'evaluation',
    options: [
      { value: 'procured', text: 'Procured' },
      { value: 'in-progress', text: 'Procurement still going on' },
      { value: 'not-procured', text: 'Not procured' }
    ]
  },
  {
    name: 'why-not', legend: 'Why it was not procured', source: 'evaluation',
    hint: 'Only applies to devices that were not procured',
    options: [
      { value: 'decided-against', text: 'Decided against after evaluation' },
      { value: 'stopped-using', text: 'Stopped after a trial or pilot' },
      { value: 'budget', text: 'Budget or funding constraints' },
      { value: 'other', text: 'Another reason' }
    ]
  },
  {
    name: 'value-domain', legend: 'Assessed value domains', source: 'evaluation',
    options: [
      { value: 'social-value', text: 'Social value' },
      { value: 'efficiency', text: 'Efficiency' },
      { value: 'patient-and-staff', text: 'Patient and staff' },
      { value: 'supply-chain', text: 'Supply chain' },
      { value: 'purpose', text: 'Purpose' }
    ]
  },
  {
    name: 'priority', legend: 'NHS priorities', source: 'evaluation',
    options: [
      { value: 'analogue-to-digital', text: 'Analogue to digital' },
      { value: 'workforce', text: 'Workforce solutions' },
      { value: 'early-cancer-diagnosis', text: 'Early diagnosis of cancer' },
      { value: 'net-zero', text: 'Net zero' },
      { value: 'treatment-to-prevention', text: 'Treatment to prevention' },
      { value: 'elective-recovery', text: 'Elective recovery' },
      { value: 'mental-health', text: 'Mental health' },
      { value: 'cyp', text: 'Children and young people' },
      { value: 'hospital-to-home', text: 'Hospital to home' },
      { value: 'productivity', text: 'Productivity' },
      { value: 'health-inequalities', text: 'Reducing health inequalities' },
      { value: 'patient-experience', text: 'Patient experience' }
    ]
  },
  {
    name: 'pathway', legend: 'Pathway', source: 'evaluation',
    options: [
      { value: 'face-to-face', text: 'Face-to-face' },
      { value: 'autonomous', text: 'Autonomous' },
      { value: 'tele', text: 'Tele' }
    ]
  },
  {
    name: 'evidence', legend: 'Evidence quality', source: 'evaluation',
    options: [
      { value: 'rct', text: 'Randomised controlled trial' },
      { value: 'proms', text: 'Includes PROMs' },
      { value: 'framework', text: 'On a national contract or framework' }
    ]
  },
  {
    name: 'department', legend: 'Department that shared it', source: 'both',
    options: [
      { value: 'cardiology', text: 'Cardiology' },
      { value: 'critical-care', text: 'Critical Care / ICU' },
      { value: 'procurement', text: 'Procurement' },
      { value: 'renal', text: 'Renal Medicine' },
      { value: 'other', text: 'Other' }
    ]
  },
  {
    name: 'period', legend: 'How recent', source: 'both',
    options: [
      { value: 'within-1-year', text: 'Within the last year' },
      { value: '1-to-3-years', text: '1 to 3 years ago' },
      { value: 'over-3-years', text: 'More than 3 years ago' }
    ]
  },
  {
    name: 'bc-covers', legend: 'What the business case covers', source: 'business case',
    options: [
      { value: 'clinical-need', text: 'Clinical need and rationale' },
      { value: 'cost-benefit', text: 'Financial analysis and cost-benefit' },
      { value: 'options-appraisal', text: 'Options appraisal' },
      { value: 'implementation', text: 'Implementation plan' },
      { value: 'risk', text: 'Risk assessment' },
      { value: 'governance', text: 'Governance and approvals' }
    ]
  },
  {
    name: 'cost-basis', legend: 'Kind of costs shown', source: 'business case',
    options: [
      { value: 'annual', text: 'Annual cost' },
      { value: 'whole-life', text: 'Whole life cost' },
      { value: 'per-unit', text: 'Cost per unit' },
      { value: 'patient-level', text: 'Cost per patient' }
    ]
  },
  {
    name: 'bc-approved', legend: 'Business case outcome', source: 'business case',
    options: [
      { value: 'yes', text: 'Approved, procurement proceeded' },
      { value: 'no', text: 'Rejected or not taken forward' },
      { value: 'pending', text: 'Awaiting decision' }
    ]
  },
  {
    name: 'discuss', legend: 'Trusts happy to discuss', source: 'both',
    options: [
      { value: 'clinical-outcomes', text: 'Clinical outcomes and effectiveness' },
      { value: 'evaluation-methodology', text: 'Evaluation methodology' },
      { value: 'implementation', text: 'Implementation and training' },
      { value: 'integration', text: 'System integration' },
      { value: 'procurement-process', text: 'Procurement process' },
      { value: 'costs', text: 'Costs and value' },
      { value: 'supplier-experience', text: 'Supplier experience' },
      { value: 'other', text: 'Something else' }
    ]
  },
  {
    name: 'trust', legend: 'Evidence from trusts like mine', source: 'existing',
    hint: 'Show devices evaluated by trusts similar in size, type, or region',
    options: [
      { value: 'similar', text: 'Similar size to my trust' },
      { value: 'teaching', text: 'Teaching hospitals' },
      { value: 'region', text: 'In my region' },
      { value: 'specialist', text: 'Specialist trusts' }
    ]
  },
  {
    name: 'size', legend: 'Supplier size', source: 'existing',
    options: [
      { value: 'micro', text: 'Micro (1 to 10 employees)' },
      { value: 'small', text: 'Small (11 to 50 employees)' },
      { value: 'medium', text: 'Medium (51 to 250 employees)' },
      { value: 'large', text: 'Large (251 or more employees)' }
    ]
  },
  {
    name: 'maturity', legend: 'Supplier maturity', source: 'existing',
    options: [
      { value: '1-2', text: '1 to 2 years old' },
      { value: '3-5', text: '3 to 5 years old' },
      { value: '5-plus', text: '5 or more years old' }
    ]
  }
]

// Pick one option from a group.
function pickOne(rand, options) {
  return options[Math.min(options.length - 1, Math.floor(rand() * options.length))].value
}

// Pick a few options from a group. `chance` is the odds of each one being picked,
// and at least one always is, so no device ends up with an empty answer.
function pickSome(rand, options, chance) {
  const picked = options.filter(() => rand() < chance).map(o => o.value)
  return picked.length ? picked : [pickOne(rand, options)]
}

function optionsFor(name) {
  return FILTERS.find(f => f.name === name).options
}

// The generated answers for one device. Seeded on PRODUCT_ID, so the same device
// always gets the same answers.
function mockAnswers(productId) {
  const rand = mb32(productId)

  // Most devices in a real catalogue have been procured by somebody, so the
  // spread here is weighted rather than even.
  const outcomeRoll = rand()
  const outcome = outcomeRoll < 0.6 ? 'procured' : outcomeRoll < 0.8 ? 'in-progress' : 'not-procured'

  const documents = pickSome(rand, optionsFor('document'), 0.6)

  return {
    document: documents,
    outcome: [outcome],
    // Only devices that were not procured have a reason why not.
    'why-not': outcome === 'not-procured' ? [pickOne(rand, optionsFor('why-not'))] : [],
    'value-domain': pickSome(rand, optionsFor('value-domain'), 0.45),
    priority: pickSome(rand, optionsFor('priority'), 0.25),
    pathway: pickSome(rand, optionsFor('pathway'), 0.4),
    evidence: pickSome(rand, optionsFor('evidence'), 0.35),
    department: [pickOne(rand, optionsFor('department'))],
    period: [pickOne(rand, optionsFor('period'))],
    // The business case filters only apply if the device has a business case.
    'bc-covers': documents.includes('business-case') ? pickSome(rand, optionsFor('bc-covers'), 0.4) : [],
    'cost-basis': documents.includes('business-case') ? pickSome(rand, optionsFor('cost-basis'), 0.4) : [],
    'bc-approved': documents.includes('business-case') ? [pickOne(rand, optionsFor('bc-approved'))] : [],
    discuss: pickSome(rand, optionsFor('discuss'), 0.35),
    trust: pickSome(rand, optionsFor('trust'), 0.4),
    size: [pickOne(rand, optionsFor('size'))],
    maturity: [pickOne(rand, optionsFor('maturity'))]
  }
}

const pageSize = 25
const allQuery = db.prepare('select PRODUCT_ID, DEVICE_ID, PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY from search')
const termQuery = db.prepare('select PRODUCT_ID, DEVICE_ID, PRODUCT_NAME, MODEL, MANUFACTURER, GMDN_NAME, TYPE, COUNTRY from search where search match @term')

// Escape double quotes for FTS5, as current/routes.js does.
function formatFtsTerm(term) {
  return `"${term.replaceAll('"', '""')}"`
}

// Selected values for one filter group. "_unchecked" is what the prototype kit
// posts for a checkbox nobody ticked.
function selected(req, name) {
  return [req.query[name] || []].flat().filter(v => v && v !== '_unchecked')
}

// A device matches a group if it has any of the ticked values (OR), and it has
// to match every group that has something ticked (AND). That is how the NHS
// filter pattern behaves.
function matchesGroup(device, name, chosen) {
  if (!chosen.length) return true
  return chosen.some(value => device.answers[name].includes(value))
}

function matchesAll(device, chosenByGroup, exceptGroup) {
  if (exceptGroup !== 'category' && chosenByGroup.category.length && !chosenByGroup.category.includes(device.category)) return false
  return FILTERS.every(f => f.name === exceptGroup || matchesGroup(device, f.name, chosenByGroup[f.name]))
}

router.get(/search-/, (req, res, next) => {
  const term = req.query.q?.toString().trim()
  const page = parseInt(req.query.page || '1') - 1

  const rows = term ? termQuery.all({ term: formatFtsTerm(term) }) : allQuery.all()

  const devices = rows.map(row => ({
    make: row.MAKE,
    make_id: row.PRODUCT_ID,
    model: row.MODEL,
    device_id: row.DEVICE_ID,
    manufacturer: row.MANUFACTURER,
    category: row.GMDN_NAME,
    type: row.TYPE,
    country: row.COUNTRY,
    answers: mockAnswers(row.PRODUCT_ID)
  }))

  const chosenByGroup = { category: selected(req, 'category') }
  FILTERS.forEach(f => { chosenByGroup[f.name] = selected(req, f.name) })

  const matching = devices.filter(d => matchesAll(d, chosenByGroup))

  // Counts next to each option say how many results you would get if you also
  // ticked it, so a count is never at odds with what ticking it does. Each group
  // is counted against the results filtered by every OTHER group.
  const categoryCounts = new Map()
  devices.filter(d => matchesAll(d, chosenByGroup, 'category')).forEach(d => {
    categoryCounts.set(d.category, (categoryCounts.get(d.category) || 0) + 1)
  })

  res.locals.searchResultCategories = Array.from(categoryCounts, ([name, count]) => ({
    name,
    count,
    selected: chosenByGroup.category.includes(name)
  })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))

  res.locals.searchFilters = FILTERS.map(f => {
    const withoutThisGroup = devices.filter(d => matchesAll(d, chosenByGroup, f.name))
    return {
      ...f,
      options: f.options.map(o => ({
        ...o,
        count: withoutThisGroup.filter(d => d.answers[f.name].includes(o.value)).length,
        selected: chosenByGroup[f.name].includes(o.value)
      }))
    }
  })

  // Everything ticked, as a flat list, so the page can offer a way to remove
  // each one individually.
  const applied = []
  chosenByGroup.category.forEach(value => applied.push({ group: 'category', legend: 'Category (GMDN)', value, text: value }))
  FILTERS.forEach(f => {
    f.options.filter(o => chosenByGroup[f.name].includes(o.value))
      .forEach(o => applied.push({ group: f.name, legend: f.legend, value: o.value, text: o.text }))
  })

  // A link that keeps every other filter but drops this one.
  applied.forEach(a => {
    const params = new URLSearchParams()
    if (term) params.append('q', term)
    if (a.group !== 'category') chosenByGroup.category.forEach(v => params.append('category', v))
    else chosenByGroup.category.filter(v => v !== a.value).forEach(v => params.append('category', v))
    FILTERS.forEach(f => {
      chosenByGroup[f.name]
        .filter(v => !(f.name === a.group && v === a.value))
        .forEach(v => params.append(f.name, v))
    })
    a.removeHref = `?${params.toString()}`
  })

  res.locals.searchAppliedFilters = applied
  res.locals.searchClearHref = term ? `?q=${encodeURIComponent(term)}` : '?'

  // Keep the term and the filters on pagination links.
  const pageParams = new URLSearchParams()
  if (term) pageParams.append('q', term)
  chosenByGroup.category.forEach(v => pageParams.append('category', v))
  FILTERS.forEach(f => chosenByGroup[f.name].forEach(v => pageParams.append(f.name, v)))
  res.locals.searchQueryString = pageParams.toString()

  res.locals.searchTerm = term
  res.locals.searchResultsCount = matching.length
  res.locals.searchTotalCount = devices.length
  res.locals.searchOffset = matching.length > 0 ? (page * pageSize) + 1 : 0
  res.locals.searchPage = page + 1
  res.locals.searchMaxPages = Math.max(1, Math.ceil(matching.length / pageSize))
  res.locals.searchResults = matching.slice(page * pageSize, (page + 1) * pageSize)

  next()
})

module.exports = router
