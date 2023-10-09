package llmflow

import (
	_ "embed"

	"github.com/RussellLuo/orchestrator/builtin"
)

//go:embed code.json
var codeJSON []byte

//go:embed llm.json
var llmJSON []byte

//go:embed embedding.json
var embeddingJSON []byte

//go:embed vectorstore_upsert.json
var vectorstoreUpsertJSON []byte

//go:embed vectorstore_query.json
var vectorstoreQueryJSON []byte

//go:embed vectorstore_delete.json
var vectorstoreDeleteJSON []byte

func init() {
	builtin.LoaderRegistry.MustRegister("system", builtin.MapLoader{
		"code":               builtin.MustUnmarshalToMap(codeJSON),
		"llm":                builtin.MustUnmarshalToMap(llmJSON),
		"embedding":          builtin.MustUnmarshalToMap(embeddingJSON),
		"vectorstore_upsert": builtin.MustUnmarshalToMap(vectorstoreUpsertJSON),
		"vectorstore_query":  builtin.MustUnmarshalToMap(vectorstoreQueryJSON),
		"vectorstore_delete": builtin.MustUnmarshalToMap(vectorstoreDeleteJSON),
	})
}
