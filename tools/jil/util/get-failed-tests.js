
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const { BUILD_NUMBER, NRQL_API_KEY } = process.env

console.log("NRQL_API_KEY", NRQL_API_KEY)

if (!BUILD_NUMBER) process.exit(1)

const queryNR = async () => {
    console.log("---- FETCHING --", BUILD_NUMBER, " ----")
    const latest = getGQLResults(await getDataFromNRQL(`{
        actor {
            account(id: 1672072) {
               nrql(query: "FROM JilTest SELECT latest(remaining) where build = '${BUILD_NUMBER}' FACET browserName, browserVersion, platformName, platformVersion LIMIT 50 SINCE 7 DAYS AGO") {
                  results
               }
            }
         }
    }`))
    if (latest.some(x => !!x['latest.remaining'])) {
        console.log("all tests did not finish....")
        console.log(latest)
        process.exit(1)
    }
    const failures = await getDataFromNRQL(`{
        actor {
            account(id: 1672072) {
               nrql(query: "FROM JilTest SELECT * where build = '${BUILD_NUMBER}' AND passed is false and retryRun is true and retry = 2 SINCE 7 days ago") {
                  results
               }
            }
         }
    }`)
    const failedTests = {
        chrome: {},
        firefox: {},
        safari: {},
        edge: {},
        android: {},
        ios: {}

    }
    failures?.data?.actor?.account?.nrql?.results.forEach(x => {
        failedTests[x.browserName.toLowerCase()][x.browserVersion] = failedTests[x.browserName.toLowerCase()][x.browserVersion] ? failedTests[x.browserName.toLowerCase()][x.browserVersion] : new Set()
        failedTests[x.browserName.toLowerCase()][x.browserVersion].add(x.testFileName)
    })

    console.log("---- FAILED TESTS ----")
    console.log(failedTests)
    var isValid = true
    var out = failures?.data?.actor?.account?.nrql?.results?.length ? 'node --max-old-space-size=8192 ./tools/jil/bin/cli.js -f merged -s -t 85000 -b ' : ''
    Object.entries(failedTests).forEach(([key, val]) => {
        if (!val || (typeof val === 'object' && !Object.keys(val).length)) return
        isValid = false
        const b = `${key}@`
        const browsers = []
        let tests = new Set()
        Object.entries(val).forEach(([subKey, subVal]) => {
            if (subVal.size) {
                browsers.push(b+subKey)
                for (val of subVal) {
                    tests.add(val)
                }
            }
        })
        out += browsers.join(",")
        out += ` ${Array.from(tests).join(" ")}`
    })
    console.log("---- LOCAL COMMAND ----")
    console.log(out)
    if (!isValid) process.exit(1)
    else process.exit(0)
}

queryNR()

async function getDataFromNRQL(nrqlString){
    const body = {query: nrqlString}
    const resp = await fetch("https://api.newrelic.com/graphql", {
        body: JSON.stringify(body),
        headers: {
            "Api-Key": `${NRQL_API_KEY}`,
            "Content-Type": "application/json"
        },
        method: "POST"
    })
    const json = await resp.json()
    return json
}

function getGQLResults(gql){
    return gql?.data?.actor?.account?.nrql?.results
}