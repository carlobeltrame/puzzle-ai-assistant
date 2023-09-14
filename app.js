import 'dotenv/config'
import { compile } from 'html-to-text'
import { RecursiveUrlLoader } from 'langchain/document_loaders/web/recursive_url'
import { PromptTemplate } from 'langchain/prompts'
import { OpenAI } from 'langchain/llms/openai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { HNSWLib } from 'langchain/vectorstores/hnswlib'

const OFFER_DESCRIPTION = 'Aufgrund von Wetterdaten die Mobilität voraussagen'
const CALCULATE_NEW_EMBEDDINGS = true

const urls = [
  'https://www.puzzle.ch/referenzen/eine-bewegte-applikation',
  'https://www.puzzle.ch/referenzen/lezzgo-die-innovative-ticket-app',
  'https://www.puzzle.ch/referenzen/lopas-mobile-app-fuer-die-bls-zugfuehrer-2',
  'https://www.puzzle.ch/referenzen/die-gesamte-verwaltung-unter-einem-hut-hitobito',
  'https://www.puzzle.ch/referenzen/devopsdb-swisscom',
  'https://www.puzzle.ch/referenzen/hochverfuegbare-cluster-fuer-logistik-automationsloesungen',
  'https://www.puzzle.ch/referenzen/wetter-alarm-der-unwetter-warndienst-der-schweiz'
]

const compiledConvert = (...args) => {
  return compile({
    wordwrap: 130,
    baseElements: {
      selectors: ['.page-title', '.page-content']
    }
  })(...args).substring(0, 12000)
}

let vectorStore
const embeddings = new OpenAIEmbeddings()
if (CALCULATE_NEW_EMBEDDINGS) {
  const docs = (await Promise.all(urls.map(async (url) => {
    const loader = new RecursiveUrlLoader(url, {
      extractor: compiledConvert,
      maxDepth: 0,
      excludeDirs: []
    })
    return await loader.load()
  }))).flat()
  vectorStore = await HNSWLib.fromDocuments(docs, embeddings)
  vectorStore.save('embeddings')
} else {
  vectorStore = await HNSWLib.load('embeddings', embeddings)
}
const retriever = vectorStore.asRetriever(2)

const relevantDocuments = await retriever.getRelevantDocuments(OFFER_DESCRIPTION)

const referenceSelectionPrompt = PromptTemplate.fromTemplate(`Formuliere je einen kurzen Abschnitt pro gegebenem Referenzbericht, für die gegebene Offerte. Achte darauf, vor allem die Aspekte des jeweiligen Referenzberichts hervorzuheben, die für das offerierte Projekt relevant sind.\n
>>>
Offerte:
{offerDescription}

>>>
Referenzberichte die gekürzt und für die Offerte formuliert werden sollen:
{referenceDescriptions}

>>>
Pro Referenzbericht ein kurzer Abschnitt für die Offerte:
`, { inputVariables: ['offerDescription', 'referenceDescriptions'] })

const model = new OpenAI({ maxTokens: 1024 }) // TODO replace with private LLM
console.log(await model.call(await referenceSelectionPrompt.format({
  offerDescription: OFFER_DESCRIPTION,
  referenceDescriptions: relevantDocuments.map((doc) => doc.pageContent).join('\n\n'),
})))
