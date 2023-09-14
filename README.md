Puzzle AI Assistant
===

Created at the Techworkshop 2023 by Pippo, Tobias, Olivier and Carlo.

To run this POC on the console, copy .env.example to .env, fill in your OPENAI_API_KEY.
Then, you can use the included docker compose setup to run the langchain app:
```
docker compose run node
```

To avoid re-downloading and re-calculating the embeddings of all ingested documents (the project references for now),
you can set `CALCULATE_NEW_EMBEDDINGS` to `false` after the first run.
This will reduce the costs on your OpenAI account.
