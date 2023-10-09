# LLMFlow

[![Go Reference](https://pkg.go.dev/badge/go-aie/llmflow/vulndb.svg)][2]

Orchestration engine & UI for your customized LLM flow.

![LLMFlow](llmflow-ui-screenshot.png)

## Installation

```bash
go install github.com/go-aie/llmflow/cmd/llmflow@latest
```

## Run

1. Run [OneAI][1].

2. Run [Python Code Server](cmd/llmflow/pycode).

3. Run the orchestration engine:

    ```bash
    CODE_API_ENDPOINT=http://127.0.0.1:5000/exec llmflow
    ```
   

## System Tasks

Defined in JSON:

- [LLM](llm.json)
- [Embedding](embedding.json)
- [Code](code.json)
- [VectorStore_Upsert](vectorstore_upsert.json)
- [VectorStore_Query](vectorstore_query.json)
- [VectorStore_Delete](vectorstore_delete.json)

Defined in Go:

- [Template](template.go)
- [Loader](loader.go)
- [Splitter](splitter.go)


## Documentation

Check out the [documentation][2].


[1]: https://github.com/go-aie/oneai
[2]: https://pkg.go.dev/github.com/go-aie/llmflow
