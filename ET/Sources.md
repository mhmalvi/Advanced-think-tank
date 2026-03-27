# Advanced Think Tank — Data Sources

## News Aggregator APIs

### NewsAPI.ai (EventRegistry)

- **Site**: https://newsapi.ai
- **API**: `https://eventregistry.org/api/v1/article/getArticles`
- **Docs**: https://newsapi.ai/documentation
- **Cost**: Free tier (2,000 tokens) · Paid plans for higher volume
- 150,000+ sources, 60+ languages, real-time + historical back to 2015

### SerpAPI

- **Site**: https://serpapi.com
- **API**: `https://serpapi.com/search.json`
- **Docs**: https://serpapi.com/search-api
- **Cost**: Free (100 searches/mo) · Paid from $50/mo
- Parses Google, Bing, Yahoo, DuckDuckGo SERPs as structured JSON

### Tavily

- **Site**: https://tavily.com
- **API**: `https://api.tavily.com/search` (POST)
- **Docs**: https://docs.tavily.com
- **Cost**: Free (1,000 credits/mo) · Paid plans available
- AI-native search optimized for LLM agents, returns clean summarized content

### Perplexity

- **Site**: https://perplexity.ai
- **API**: `https://api.perplexity.ai/chat/completions` (OpenAI-compatible)
- **Docs**: https://docs.perplexity.ai
- **Cost**: Pay-as-you-go · $5/1K web search requests · Pro subs get $5/mo credit
- LLM with live web search grounding via Sonar models

### Mediastack

- **Site**: https://mediastack.com
- **API**: `http://api.mediastack.com/v1/news`
- **Docs**: https://mediastack.com/documentation
- **Cost**: Free (100 req/mo) · Paid from $9.99/mo
- Live + historical global news JSON API, filter by country/language/category

### NewsCatcher API

- **Site**: https://newscatcherapi.com
- **API**: `https://v3-api.newscatcherapi.com/api/search`
- **Docs**: https://www.newscatcherapi.com/docs/v3/api-reference/overview/introduction
- **Cost**: Free (21 calls/hr, 15K/mo) · Paid from $399/mo
- 60,000+ sources, 150 countries, 60 languages

### GDELT Project

- **Site**: https://www.gdeltproject.org
- **API**: `https://api.gdeltproject.org/api/v2/doc/doc`
- **GEO API**: `https://api.gdeltproject.org/api/v2/geo/geo`
- **Data**: https://www.gdeltproject.org/data.html
- **Cost**: FREE — no API key required
- Monitors world news in 100+ languages, updated every 15 minutes, archives to 1979
- Example: `https://api.gdeltproject.org/api/v2/doc/doc?query=denmark&mode=artlist&maxrecords=50&format=json`

---

## Danish / Nordic Sources

### Danmarks Statistik

- **Site**: https://www.dst.dk
- **RSS (DA)**: `https://rss.dst.dk/da`
- **RSS (EN)**: `https://rss.dst.dk/en`
- **StatBank**: https://www.statbank.dk
- **Cost**: FREE
- Official Danish statistics — demographics, economy, labor market

### Berlingske

- **Site**: https://www.berlingske.dk
- **RSS**: `https://www.berlingske.dk/content/rss`
- **Cost**: RSS free (headlines) · Full articles paywalled
- Major Danish newspaper — politics, business, culture

### Børsen

- **Site**: https://borsen.dk
- **RSS**: `https://borsen.dk/rss/investor`
- **Cost**: RSS free (headlines) · Full articles paywalled
- Denmark's primary financial/business newspaper

---

## European & International Data

### Eurostat

- **Site**: https://ec.europa.eu/eurostat
- **RSS (EN)**: `https://ec.europa.eu/eurostat/api/dissemination/catalogue/rss/en/statistics-update.rss`
- **RSS (DE)**: `https://ec.europa.eu/eurostat/api/dissemination/catalogue/rss/de/statistics-update.rss`
- **RSS (FR)**: `https://ec.europa.eu/eurostat/api/dissemination/catalogue/rss/fr/statistics-update.rss`
- **API**: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{datasetCode}`
- **Swagger**: https://ec.europa.eu/eurostat/api/dissemination/swagger-ui
- **Docs**: https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started
- **Cost**: FREE
- All EU statistics — economics, demographics, energy, trade. JSON/CSV/XML.

### OECD

- **Site**: https://www.oecd.org
- **RSS Feeds**: https://search.oecd.org/rssfeeds/
- **API (SDMX)**: `https://sdmx.oecd.org/public/rest/data/`
- **Data Explorer**: https://data-explorer.oecd.org/
- **Cost**: FREE
- Economic and social statistics for OECD member countries

### Energy Data Service (Energinet)

- **Site**: https://www.energidataservice.dk
- **API**: `https://api.energidataservice.dk/dataset/{datasetName}`
- **Guides**: https://www.energidataservice.dk/guides/api-guides
- **Datasets**: https://www.energidataservice.dk/datasets
- **Cost**: FREE
- Danish electricity market data, spot prices, CO2 emissions, wind/solar generation
- Example: `https://api.energidataservice.dk/dataset/Elspotprices?start=2024-01-01&filter={"PriceArea":["DK1"]}`

### Financial Times

- **Site**: https://www.ft.com
- **RSS Home**: `https://www.ft.com/rss/home`
- **RSS World**: `https://www.ft.com/world?format=rss`
- **RSS Companies**: `https://www.ft.com/companies?format=rss`
- **RSS Markets**: `https://www.ft.com/markets?format=rss`
- **RSS Opinion**: `https://www.ft.com/opinion?format=rss`
- **Cost**: RSS free (headlines) · Full articles ~$39/mo
- Pattern: `https://www.ft.com/{section}?format=rss`

### The Economist

- **Site**: https://www.economist.com
- **RSS Finance**: `https://www.economist.com/finance-and-economics/rss.xml`
- **RSS Business**: `https://www.economist.com/business/rss.xml`
- **RSS Europe**: `https://www.economist.com/europe/rss.xml`
- **RSS Britain**: `https://www.economist.com/britain/rss.xml`
- **RSS Science**: `https://www.economist.com/science-and-technology/rss.xml`
- **RSS Asia**: `https://www.economist.com/asia/rss.xml`
- **RSS Culture**: `https://www.economist.com/culture/rss.xml`
- **Cost**: RSS free (headlines) · Full articles ~$22/mo
- Pattern: `https://www.economist.com/{section}/rss.xml`

### Bruegel

- **Site**: https://www.bruegel.org
- **RSS All**: `https://www.bruegel.org/rss?type=all`
- **RSS Publications**: `https://www.bruegel.org/rss?type=pub`
- **RSS Blog Posts**: `https://www.bruegel.org/rss?type=blogpost`
- **RSS Blog Reviews**: `https://www.bruegel.org/rss?type=blogreview`
- **RSS Events**: `https://www.bruegel.org/rss?type=event`
- **Feeds Index**: https://bruegel.org/pages/rssfeeds
- **Cost**: FREE (full text in feeds)
- European economics think tank — EU policy, trade, energy, financial regulation

### EU Commission

- **Site**: https://commission.europa.eu
- **Press Corner**: https://ec.europa.eu/commission/presscorner/home/en
- **EU Parliament RSS**: `https://webcomm-api-rss.ep-lavinia.eu/en/feeds/european-parliament-news-website`
- **EUR-Lex RSS**: https://eur-lex.europa.eu/content/help/my-eurlex/my-rss-feeds.html
- **EU Council RSS**: https://www.consilium.europa.eu/en/about-site/rss/
- **Eurostat RSS**: `https://ec.europa.eu/eurostat/api/dissemination/catalogue/rss/en/statistics-update.rss`
- **DG Internal Market**: `https://single-market-economy.ec.europa.eu/rss_en`
- **Cost**: FREE
- Multiple feeds per institution — legislation, press releases, statistics

---

## Quick Reference

| Source             | Type    | Cost         | Key Endpoint                           |
| ------------------ | ------- | ------------ | -------------------------------------- |
| NewsAPI.ai         | API     | Freemium     | `eventregistry.org/api/v1/`            |
| SerpAPI            | API     | $50+/mo      | `serpapi.com/search.json`              |
| Tavily             | API     | Freemium     | `api.tavily.com/search`                |
| Perplexity         | API     | Pay-per-use  | `api.perplexity.ai/chat/completions`   |
| Mediastack         | API     | Freemium     | `api.mediastack.com/v1/news`           |
| NewsCatcher        | API     | Freemium     | `v3-api.newscatcherapi.com/api/search` |
| GDELT              | API     | FREE         | `api.gdeltproject.org/api/v2/doc/doc`  |
| Danmarks Statistik | RSS     | FREE         | `rss.dst.dk/da`                        |
| Berlingske         | RSS     | Free/Paywall | `berlingske.dk/content/rss`            |
| Børsen             | RSS     | Free/Paywall | `borsen.dk/rss/investor`               |
| Eurostat           | RSS+API | FREE         | `ec.europa.eu/eurostat/api/...`        |
| OECD               | RSS+API | FREE         | `sdmx.oecd.org/public/rest/data/`      |
| Energinet          | API     | FREE         | `api.energidataservice.dk/dataset/`    |
| Financial Times    | RSS     | Free/Paywall | `ft.com/rss/home`                      |
| The Economist      | RSS     | Free/Paywall | `economist.com/{section}/rss.xml`      |
| Bruegel            | RSS     | FREE         | `bruegel.org/rss?type=all`             |
| EU Commission      | RSS     | FREE         | Multiple per institution               |
