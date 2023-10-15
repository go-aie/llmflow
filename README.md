# LLMFlow

[![Go Reference](https://pkg.go.dev/badge/go-aie/llmflow/vulndb.svg)][1]

Orchestration engine & UI for your customized LLM flow.

![LLMFlow](llmflow-ui-screenshot.png)

## Installation

```bash
go install github.com/go-aie/llmflow/cmd/llmflow@latest
```

## Run

1. Run [OneAI][2].

2. Run [Python Code Server](cmd/llmflow/pycode).

3. Run the orchestration engine:

    ```bash
    CODE_API_ENDPOINT=http://127.0.0.1:5000/exec llmflow
    ```
   

## Tasks & Flows

In addition to [Orchestrator's built-in tasks][3], LLMFlow defines the following tasks and flows:

   - Tasks
      + [Template](template.go)
      + [Loader](loader.go)
      + [Splitter](splitter.go)

   - Flows
      + [LLM](llm.flow.json)
      + [Embedding](embedding.flow.json)
      + [Code](code.flow.json)
      + [VectorStore_Upsert](vectorstore_upsert.flow.json)
      + [VectorStore_Query](vectorstore_query.flow.json)
      + [VectorStore_Delete](vectorstore_delete.flow.json)


## Documentation

Check out the [documentation][1].


[1]: https://pkg.go.dev/github.com/go-aie/llmflow
[2]: https://github.com/go-aie/oneai
[3]: https://github.com/RussellLuo/orchestrator#task
