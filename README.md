# LLMFlow

[![Go Reference](https://pkg.go.dev/badge/go-aie/llmflow/vulndb.svg)][1]

Orchestration engine & UI for your customized LLM flow.

![LLMFlow](llmflow-ui-screenshot.png)

## Installation

```bash
go install github.com/go-aie/llmflow/cmd/llmflow@latest
```

## Quick Start

### API

Run LLMFlow:

```bash
OPENAI_API_KEY=<YOUR_API_KEY> llmflow
```

Add the basic flow:

```bash
curl -XPUT -H 'Content-Type: application/json' 'http://127.0.0.1:8888/api/flows/basic' -d @examples/basic.flow.json
```

Execute the basic flow:

```bash
curl -XPOST -H 'Content-Type: application/json' 'http://127.0.0.1:8888/api/flows/basic:run' -d '{"query":"colorful socks"}'
```

> **NOTE**:
> 
> - Setting environment variables is not mandatory when running LLMFlow in this example.
> - As an alternative, you can change `api_key` to your API key in [basic.flow.json](examples/basic.flow.json) (see [UI](#ui)), and then run `llmflow` instead.

### UI

Open LLMFlow UI through your browser: http://127.0.0.1:8888.

Then click the `Open` button and select [basic.flow.json](examples/basic.flow.json) to view it in the UI.


## Tasks & Flows

In addition to [Orchestrator's built-in tasks][2], LLMFlow defines the following tasks and flows:

   - Tasks
      + [JSONLinesLoader](loader.go#L49-L170)
      + [Splitter](splitter.go)
      + [Template](template.go)
      + [TextLoader](loader.go#L172-L228)
      + [VectorStore_Delete](vectorstore/vectorstore_delete.go)
      + [VectorStore_Query](vectorstore/vectorstore_query.go)
      + [VectorStore_Upsert](vectorstore/vectorstore_upsert.go)

   - Flows
      + [Embedding_OpenAI](embedding/embedding_openai.flow.json)
      + [LLM_OpenAI](llm/llm_openai.flow.json)
      + [xHTTP](xhttp.flow.json)


## Examples

- [Basic](examples/basic.flow.json)
- Document Question Answering
    + [Feed](examples/docqa_feed.flow.json)
    + [Query](examples/docqa_query.flow.json)
- FAQ-based Question Answering
    + [Feed](examples/faq_feed.flow.json)
    + [Query](examples/faq_query.flow.json)
- [Table Question Answering](examples/tableqa.flow.json) (*requires [TableQA][3]*)
- Table & Document Question Answering (*requires [TableQA][3]*)
    + [Feed](examples/tableqa_docqa_feed.flow.json)
    + [Query](examples/tableqa_docqa_query.flow.json)


## Documentation

Check out the [documentation][1].


[1]: https://pkg.go.dev/github.com/go-aie/llmflow
[2]: https://github.com/RussellLuo/orchestrator#task
[3]: https://github.com/go-aie/tableqa
